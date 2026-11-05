import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDate, formatDateTime } from '../../lib/format'
import { TIME_RANGES } from '../../lib/validators'
import { BOOKING_STATUS, statusLabel } from '../lib/status'
import { bookingActions, canComplete, canOfferReschedule, validateReschedule } from '../lib/bookings'
import { whatsappUrl } from '../lib/quotes'
import { Field, StatusBadge, friendlyDbError } from '../components'
import { useTitle } from '../useAdminHead'

export default function BookingDetail() {
  const { id } = useParams()
  useTitle('Booking')
  const [state, setState] = useState({ loading: true })
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notes, setNotes] = useState('')
  const [files, setFiles] = useState([])
  const [form, setForm] = useState({ date: '', time: '' })
  const [errors, setErrors] = useState({})

  const load = useCallback(async () => {
    // FIXED: Changed 'bookings' to 'service_bookings'
    const r = await supabase.from('service_bookings').select('*, services(title)').eq('id', id).maybeSingle()
    if (r.error) return setState({ loading: false, failed: true })
    if (!r.data) return setState({ loading: false, missing: true })
    
    setNotes(r.data.internal_notes ?? '')
    setState({ loading: false, booking: r.data })
    
    const list = await Promise.all((r.data.attachments ?? []).map(async (path) => {
      const { data } = await supabase.storage.from('customer-uploads').createSignedUrl(path, 600)
      return { path, name: path.split('/').pop(), url: data?.signedUrl ?? '' }
    }))
    setFiles(list)
  }, [id])

  useEffect(() => { load() }, [load])

  async function update(changes, okText) {
    setBusy(true); setMsg(null)
    // FIXED: Changed 'bookings' to 'service_bookings'
    const { error } = await supabase.from('service_bookings').update(changes).eq('id', id)
    setBusy(false)
    if (error) { setMsg({ ok: false, text: friendlyDbError(error) }); return false }
    setMsg({ ok: true, text: okText }); await load(); return true
  }

  if (state.loading) return <p role="status">Loading booking…</p>
  if (state.failed) return <p className="a-error" role="alert">Could not load this booking. Refresh the page to try again.</p>
  if (state.missing) return <><p className="a-notice">This booking was not found.</p><Link to="/admin/bookings">Back to bookings</Link></>

  const b = state.booking
  const actions = bookingActions(b.status)
  // FIXED: Changed b.reference to b.reference_number
  const wa = whatsappUrl(b.phone, `Hello ${b.full_name}, this is DE DON DC about your booking ${b.reference_number}.`)

  const propose = async (e) => {
    e.preventDefault()
    const errs = validateReschedule(form)
    setErrors(errs)
    if (Object.keys(errs).length) return
    const ok = await update({ status: 'reschedule_proposed', proposed_date: form.date, proposed_time: form.time }, 'New time recorded. Tell the customer, and confirm it once they agree.')
    if (ok) setForm({ date: '', time: '' })
  }

  return (
    <>
      <p><Link to="/admin/bookings">← All bookings</Link></p>
      {/* FIXED: Changed b.reference to b.reference_number */}
      <h1>{b.reference_number} <StatusBadge status={b.status} map={BOOKING_STATUS} /></h1>
      {msg && <p className={msg.ok ? 'a-notice' : 'a-error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}

      <div className="a-cols">
        <section className="a-card" aria-labelledby="bc-h">
          <h2 id="bc-h">Customer</h2>
          <dl className="a-dl">
            <dt>Name</dt><dd>{b.full_name}</dd>
            <dt>Email</dt><dd><a href={`mailto:${b.email}`}>{b.email}</a></dd>
            <dt>Phone</dt><dd><a href={`tel:${b.phone.replace(/[^\d+]/g, '')}`}>{b.phone}</a>{wa && <> · <a href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a></>}</dd>
            <dt>Received</dt><dd>{formatDateTime(b.created_at)}</dd>
          </dl>
        </section>
        <section className="a-card" aria-labelledby="bj-h">
          <h2 id="bj-h">Job</h2>
          <dl className="a-dl">
            <dt>Service</dt><dd>{b.services?.title ?? '—'}</dd>
            <dt>Property</dt><dd>{b.property_type}</dd>
            <dt>Address</dt><dd>{b.address}</dd>
            <dt>{b.status === 'confirmed' ? 'Confirmed for' : 'Requested for'}</dt><dd>{formatDate(b.preferred_date)}, {b.preferred_time}</dd>
            {b.status === 'reschedule_proposed' && <><dt>Proposed instead</dt><dd><strong>{formatDate(b.proposed_date)}, {b.proposed_time}</strong></dd></>}
            {b.confirmed_at && <><dt>Confirmed on</dt><dd>{formatDateTime(b.confirmed_at)}</dd></>}
          </dl>
          <p className="a-pre">{b.description}</p>
          {b.instructions && <><h3>Access / special instructions</h3><p className="a-pre">{b.instructions}</p></>}
        </section>
      </div>

      <section className="a-card" aria-labelledby="ba-h">
        <h2 id="ba-h">Attachments</h2>
        {(b.attachments ?? []).length === 0 ? <p className="a-muted">The customer did not attach any files.</p> : (
          <ul className="a-files">
            {files.map((f) => <li key={f.path}>{f.url ? <a href={f.url} target="_blank" rel="noopener noreferrer">{f.name}</a> : <span>{f.name} (could not be opened)</span>}</li>)}
          </ul>
        )}
        <p className="a-muted a-hint">Files are private. Each link works for 10 minutes; refresh the page for new links.</p>
      </section>

      <section className="a-card" aria-labelledby="bs-h">
        <h2 id="bs-h">Handle this booking</h2>
        {actions.length === 0 ? <p className="a-muted">This booking is {statusLabel(BOOKING_STATUS, b.status).toLowerCase()}, so no further action is possible.</p> : (
          <div className="a-actions">
            {actions.map(([target, label, style, confirmText]) => {
              const blocked = target === 'completed' && !canComplete(b.preferred_date)
              return (
                <button key={target} className={'a-btn' + (style === 'ghost' ? ' a-btn-ghost' : '')} disabled={busy || blocked}
                  title={blocked ? 'Available on the day of the job' : undefined}
                  onClick={() => {
                    if (confirmText && !window.confirm(confirmText)) return
                    update({ status: target }, `Status changed to ${statusLabel(BOOKING_STATUS, target)}.`)
                  }}>{label}</button>
              )
            })}
          </div>
        )}
        {actions.some((a) => a[0] === 'completed') && !canComplete(b.preferred_date) && <p className="a-muted a-hint">“Mark as completed” becomes available on the day of the job.</p>}
        <p className="a-notice">Emails are not connected yet. After confirming, contact the customer yourself by phone, WhatsApp or email.</p>

        {canOfferReschedule(b.status) && (
          <>
            <h3>Propose a different date or time</h3>
            <form onSubmit={propose} noValidate>
              <Field id="rdate" label="New date" error={errors.date}>
                <input id="rdate" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </Field>
              <Field id="rtime" label="New time" error={errors.time}>
                <select id="rtime" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}>
                  <option value="">Choose…</option>
                  {TIME_RANGES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <button className="a-btn a-btn-ghost" disabled={busy}>Record proposed time</button>
            </form>
          </>
        )}

        <label htmlFor="bnotes">Internal notes (never shown to the customer)</label>
        <textarea id="bnotes" rows="4" maxLength="4000" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button className="a-btn" disabled={busy || notes === (b.internal_notes ?? '')}
          onClick={() => update({ internal_notes: notes.trim() || null }, 'Notes saved.')}>Save notes</button>
      </section>
    </>
  )
}