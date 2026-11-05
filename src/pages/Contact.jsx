import { useRef, useState } from 'react'
import Seo from '../components/Seo'
import Field from '../components/Field'
import { useSettings } from '../lib/settings'
import { supabase } from '../lib/supabase'
import { notifySubmission } from '../lib/email'
import { validateContact } from '../lib/validators'
import { errorCode } from '../components/FormParts'

const EMPTY = { name: '', email: '', phone: '', subject: '', message: '', website: '' }

export default function Contact() {
  const { company } = useSettings()
  const [f, setF] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | sending | done | failed
  const [failMsg, setFailMsg] = useState('')
  const lock = useRef(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const wa = `https://wa.me/${company.whatsapp}`

  async function submit(e) {
    e.preventDefault()
    if (lock.current) return // blocks double submits
    const errs = validateContact(f)
    setErrors(errs)
    if (Object.keys(errs).length) return
    if (f.website) { setStatus('done'); return } // honeypot: bots fill the hidden field
    if (!supabase) { setFailMsg('The website database is not connected yet.'); setStatus('failed'); return }
    lock.current = true
    setStatus('sending')
    const { data: newId, error } = await supabase.rpc('submit_contact', {
      p_name: f.name, p_email: f.email, p_phone: f.phone, p_subject: f.subject, p_message: f.message,
    })
    lock.current = false
    if (error) {
      setFailMsg(error.message.includes('Too many') ? error.message : `We could not send your message. Please try again or call us. (Support code: ${errorCode(error)})`)
      setStatus('failed')
    } else { notifySubmission('contact_received', newId); setF(EMPTY); setStatus('done') }
  }

  return (
    <>
      <Seo title="Contact Us | DE DON DC Facility Management and Cleaning Services"
           description="Call, WhatsApp or message DE DON DC Facility Management and Cleaning Services in Asaba, Delta State, serving Delta, Anambra, Ebonyi, Enugu, Imo and Abia States." />
      <section className="page-head"><div className="wrap"><h1>Contact us</h1>
        <p>Questions about a service? Send a message, call or chat on WhatsApp.</p></div></section>
      <section className="section"><div className="wrap two-col">
        <div>
          <h2>Get in touch</h2>
          <p><a href={`tel:${company.phone_primary.replace(/\s/g, '')}`}>{company.phone_primary}</a><br />
             <a href={`tel:${company.phone_secondary.replace(/\s/g, '')}`}>{company.phone_secondary}</a></p>
          <p><a href={`mailto:${company.email}`}>{company.email}</a></p>
          <h3>Our offices</h3>
          <p>{company.address || company.location}</p>
          {company.branch_address && <p>{company.branch_address}</p>}
          {company.service_areas?.length > 0 && <><h3>Areas we serve</h3><p>{company.service_areas.join(' · ')}</p></>}
          <p><a className="btn btn-primary" href={wa} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a></p>
          <h3>Opening hours</h3>
          <p>{company.opening_hours || 'Opening hours will be added by the company.'}</p>
          <h3>Map</h3>
          {company.map_embed_url
            ? <iframe title="Business location map" className="map" src={company.map_embed_url} loading="lazy" />
            : <p className="notice">A map will be added soon. Please call us for directions to either office.</p>}
        </div>

        <form onSubmit={submit} noValidate aria-busy={status === 'sending'}>
          <h2>Send a message</h2>
          {status === 'done' && (
            <p className="ok" role="status">Thank you. Your message has been received and saved. We will reply as soon as we can.</p>
          )}
          {status === 'failed' && <p className="err box" role="alert">{failMsg}</p>}
          <Field id="name" label="Full name" error={errors.name}>
            <input id="name" value={f.name} onChange={set('name')} autoComplete="name" aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-err' : undefined} />
          </Field>
          <Field id="email" label="Email address" error={errors.email}>
            <input id="email" type="email" value={f.email} onChange={set('email')} autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-err' : undefined} />
          </Field>
          <Field id="phone" label="Phone number (optional)" error={errors.phone}>
            <input id="phone" type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'phone-err' : undefined} />
          </Field>
          <Field id="subject" label="Subject" error={errors.subject}>
            <input id="subject" value={f.subject} onChange={set('subject')} aria-invalid={!!errors.subject} aria-describedby={errors.subject ? 'subject-err' : undefined} />
          </Field>
          <Field id="message" label="Message" error={errors.message}>
            <textarea id="message" rows="5" value={f.message} onChange={set('message')} aria-invalid={!!errors.message} aria-describedby={errors.message ? 'message-err' : undefined} />
          </Field>
          <div className="hp" aria-hidden="true">
            <label>Website<input tabIndex="-1" autoComplete="off" value={f.website} onChange={set('website')} /></label>
          </div>
          <button className="btn btn-primary" disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending…' : 'Send message'}
          </button>
        </form>
      </div></section>
    </>
  )
}
