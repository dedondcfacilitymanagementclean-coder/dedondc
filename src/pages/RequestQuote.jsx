import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Seo from '../components/Seo'
import Field from '../components/Field'
import { ServiceSelect, FileInput, Consent, Honeypot, friendlyError } from '../components/FormParts'
import { supabase } from '../lib/supabase'
import { notifySubmission } from '../lib/email'
import { uploadAttachments } from '../lib/upload'
import { PROPERTY_TYPES, CONTACT_METHODS, todayISO, normalizePhone, validateQuote, validateFiles } from '../lib/validators'

const EMPTY = { full_name: '', email: '', phone: '', preferred_contact: '', service_id: '', property_type: '',
  location: '', property_size: '', preferred_date: '', description: '', consent: false, website: '' }

export default function RequestQuote() {
  const [params] = useSearchParams()
  const slug = params.get('service')
  const [f, setF] = useState(EMPTY)
  const [files, setFiles] = useState([])
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [msg, setMsg] = useState('')
  const [ref, setRef] = useState('')
  const lock = useRef(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const a11y = (k) => ({ 'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? k + '-err' : undefined })

  async function submit(e) {
    e.preventDefault()
    if (lock.current) return
    const data = { ...f, service_id: f.service_id || '__slug__' }
    const errs = validateQuote(data)
    if (!f.service_id) {
      // a service chosen via the ?service= link counts only once the list has loaded it
      const el = document.getElementById('service_id')
      if (el?.value) { data.service_id = el.value; delete errs.service_id } else errs.service_id = 'Choose the service you need.'
    }
    const fileErr = validateFiles(files)
    if (fileErr) errs.files = fileErr
    setErrors(errs)
    if (Object.keys(errs).length) return
    if (f.website) { setRef('—'); setStatus('done'); return }
    if (!supabase) { setMsg('The website database is not connected yet.'); setStatus('failed'); return }
    lock.current = true
    setStatus('sending'); setMsg('')
    try {
      const attachments = files.length ? await uploadAttachments(files) : []
      const { data: reference, error } = await supabase.rpc('submit_quote_request', {
        p_full_name: data.full_name, p_email: data.email, p_phone: normalizePhone(data.phone),
        p_preferred_contact: data.preferred_contact, p_service_id: data.service_id,
        p_property_type: data.property_type, p_location: data.location, p_property_size: data.property_size,
        p_preferred_date: data.preferred_date || null, p_description: data.description,
        p_attachments: attachments, p_consent: data.consent,
      })
      if (error) throw error
      notifySubmission('quote_received', reference)
      setRef(reference); setStatus('done'); setF(EMPTY); setFiles([])
    } catch (err) {
      setMsg(friendlyError(err)); setStatus('failed')
    } finally { lock.current = false }
  }

  if (status === 'done') {
    return (
      <>
        <Seo title="Quote request received | DE DON DC" description="Quote request received." />
        <section className="section"><div className="wrap narrow">
          <h1>Request received</h1>
          <p className="ok" role="status">Your quote request has been received and is awaiting review. No quotation has been issued yet.</p>
          <p>Your reference number: <strong>{ref}</strong>. Please keep it for any follow-up.</p>
          <div className="btn-row"><Link className="btn btn-primary" to="/">Back to home</Link></div>
        </div></section>
      </>
    )
  }

  return (
    <>
      <Seo title="Request a Free Quote | DE DON DC Cleaning & Facility Management"
           description="Request a quote for cleaning, fumigation, pest control or facility maintenance in Asaba, Delta State." />
      <section className="page-head"><div className="wrap"><h1>Request a quote</h1>
        <p>Tell us about the job. We will review it and prepare a quotation. Sending this form does not create a quotation or a booking.</p></div></section>
      <section className="section"><div className="wrap narrow">
        <form onSubmit={submit} noValidate aria-busy={status === 'sending'}>
          {status === 'failed' && <p className="err box" role="alert">{msg}</p>}
          <Field id="full_name" label="Full name" error={errors.full_name}>
            <input id="full_name" value={f.full_name} onChange={set('full_name')} autoComplete="name" {...a11y('full_name')} />
          </Field>
          <Field id="email" label="Email address" error={errors.email}>
            <input id="email" type="email" value={f.email} onChange={set('email')} autoComplete="email" {...a11y('email')} />
          </Field>
          <Field id="phone" label="Phone number" error={errors.phone}>
            <input id="phone" type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" {...a11y('phone')} />
          </Field>
          <Field id="preferred_contact" label="How should we contact you?" error={errors.preferred_contact}>
            <select id="preferred_contact" value={f.preferred_contact} onChange={set('preferred_contact')} {...a11y('preferred_contact')}>
              <option value="">Choose one</option>
              {CONTACT_METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field id="service_id" label="Service required" error={errors.service_id}>
            <ServiceSelect value={f.service_id} slug={slug} onChange={set('service_id')} error={errors.service_id} />
          </Field>
          <Field id="property_type" label="Property type" error={errors.property_type}>
            <select id="property_type" value={f.property_type} onChange={set('property_type')} {...a11y('property_type')}>
              <option value="">Choose one</option>
              {PROPERTY_TYPES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field id="location" label="Property location" error={errors.location}>
            <input id="location" value={f.location} onChange={set('location')} autoComplete="street-address" {...a11y('location')} />
          </Field>
          <Field id="property_size" label="Property size, if known (optional)" hint="For example: 3 bedrooms, or 200 square metres.">
            <input id="property_size" value={f.property_size} onChange={set('property_size')} aria-describedby="property_size-hint" />
          </Field>
          <Field id="preferred_date" label="Preferred service date (optional)" error={errors.preferred_date}>
            <input id="preferred_date" type="date" min={todayISO()} value={f.preferred_date} onChange={set('preferred_date')} {...a11y('preferred_date')} />
          </Field>
          <Field id="description" label="Describe the job" error={errors.description}>
            <textarea id="description" rows="5" value={f.description} onChange={set('description')} {...a11y('description')} />
          </Field>
          <Field id="files" label="Photos or supporting files (optional)">
            <FileInput files={files} onChange={setFiles} error={errors.files} />
          </Field>
          <Consent checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} error={errors.consent} />
          <Honeypot value={f.website} onChange={set('website')} />
          <button className="btn btn-primary" disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending…' : 'Send quote request'}
          </button>
        </form>
      </div></section>
    </>
  )
}
