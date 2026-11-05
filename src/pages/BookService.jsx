import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Seo from '../components/Seo'
import Field from '../components/Field'
import { ServiceSelect, FileInput, Consent, Honeypot, friendlyError } from '../components/FormParts'
import { supabase } from '../lib/supabase'
import { notifySubmission } from '../lib/email'
import { uploadAttachments } from '../lib/upload'
import { PROPERTY_TYPES, TIME_RANGES, todayISO, normalizePhone, validateBooking, validateFiles } from '../lib/validators'

const EMPTY = { full_name: '', email: '', phone: '', service_id: '', address: '', property_type: '',
  preferred_date: '', preferred_time: '', description: '', instructions: '', consent: false, website: '' }

export default function BookService() {
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
    const errs = validateBooking(data)
    if (!f.service_id) {
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
      const { data: reference, error } = await supabase.rpc('submit_booking', {
        p_full_name: data.full_name, p_email: data.email, p_phone: normalizePhone(data.phone),
        p_service_id: data.service_id, p_address: data.address, p_property_type: data.property_type,
        p_preferred_date: data.preferred_date, p_preferred_time: data.preferred_time,
        p_description: data.description, p_instructions: data.instructions,
        p_attachments: attachments, p_consent: data.consent,
      })
      if (error) throw error
      notifySubmission('booking_received', reference)
      setRef(reference); setStatus('done'); setF(EMPTY); setFiles([])
    } catch (err) {
      setMsg(friendlyError(err)); setStatus('failed')
    } finally { lock.current = false }
  }

  if (status === 'done') {
    return (
      <>
        <Seo title="Service request received | DE DON DC" description="Service request received." />
        <section className="section"><div className="wrap narrow">
          <h1>Request received</h1>
          <p className="ok" role="status">Your service request has been received. It is not a confirmed appointment yet. We will check availability and then confirm, suggest another time, or let you know if we cannot take it.</p>
          <p>Your reference number: <strong>{ref}</strong>. Please keep it for any follow-up.</p>
          <div className="btn-row"><Link className="btn btn-primary" to="/">Back to home</Link></div>
        </div></section>
      </>
    )
  }

  return (
    <>
      <Seo title="Book a Cleaning or Facility Service | DE DON DC"
           description="Request a cleaning, fumigation, pest control or facility maintenance service in Asaba. We confirm availability before your booking is final." />
      <section className="page-head"><div className="wrap"><h1>Book a service</h1>
        <p>Send your preferred date and time. This is a request only. Your booking is confirmed once we reply.</p></div></section>
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
          <Field id="service_id" label="Service required" error={errors.service_id}>
            <ServiceSelect value={f.service_id} slug={slug} onChange={set('service_id')} error={errors.service_id} />
          </Field>
          <Field id="address" label="Service address" error={errors.address}>
            <input id="address" value={f.address} onChange={set('address')} autoComplete="street-address" {...a11y('address')} />
          </Field>
          <Field id="property_type" label="Property type" error={errors.property_type}>
            <select id="property_type" value={f.property_type} onChange={set('property_type')} {...a11y('property_type')}>
              <option value="">Choose one</option>
              {PROPERTY_TYPES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field id="preferred_date" label="Preferred date" error={errors.preferred_date}>
            <input id="preferred_date" type="date" min={todayISO()} value={f.preferred_date} onChange={set('preferred_date')} {...a11y('preferred_date')} />
          </Field>
          <Field id="preferred_time" label="Preferred time" error={errors.preferred_time}>
            <select id="preferred_time" value={f.preferred_time} onChange={set('preferred_time')} {...a11y('preferred_time')}>
              <option value="">Choose one</option>
              {TIME_RANGES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field id="description" label="Describe the job" error={errors.description}>
            <textarea id="description" rows="4" value={f.description} onChange={set('description')} {...a11y('description')} />
          </Field>
          <Field id="instructions" label="Additional instructions (optional)" hint="Access, parking, security or anything else we should know.">
            <textarea id="instructions" rows="3" value={f.instructions} onChange={set('instructions')} aria-describedby="instructions-hint" />
          </Field>
          <Field id="files" label="Photos or supporting files (optional)">
            <FileInput files={files} onChange={setFiles} error={errors.files} />
          </Field>
          <Consent checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} error={errors.consent} />
          <Honeypot value={f.website} onChange={set('website')} />
          <button className="btn btn-primary" disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending…' : 'Send service request'}
          </button>
        </form>
      </div></section>
    </>
  )
}
