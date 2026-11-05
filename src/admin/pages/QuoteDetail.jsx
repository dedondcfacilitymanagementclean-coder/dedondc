import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDate, formatDateTime, formatMoney } from '../../lib/format'
import { QUOTE_STATUS, statusLabel } from '../lib/status'
import { CURRENCIES, manualStatuses, validateQuotation, parseAmount, whatsappUrl } from '../lib/quotes'
import { Field, StatusBadge, friendlyDbError } from '../components'
import { useTitle } from '../useAdminHead'
import EmailHistory from '../EmailHistory'
import { adminEmail } from '../../lib/email'

const EMPTY = { amount: '', currency: 'NGN', description: '', expires_on: '' }

export default function QuoteDetail() {
  const { id } = useParams()
  useTitle('Quote request')
  const [state, setState] = useState({ loading: true })
  const [msg, setMsg] = useState(null) // { ok: boolean, text }
  const [busy, setBusy] = useState(false)
  const [notes, setNotes] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [files, setFiles] = useState([])
  const [mailKey, setMailKey] = useState(0)

  const load = useCallback(async () => {
    const [r, qs] = await Promise.all([
      supabase.from('quote_requests').select('*, services(title)').eq('id', id).maybeSingle(),
      supabase.from('quotations').select('*').eq('quote_request_id', id).order('created_at', { ascending: false }),
    ])
    if (r.error || qs.error) return setState({ loading: false, failed: true })
    if (!r.data) return setState({ loading: false, missing: true })
    setNotes(r.data.internal_notes ?? '')
    setState({ loading: false, request: r.data, quotations: qs.data ?? [] })
    // Private files: short-lived links are made one by one; a failed file is simply left out.
    const list = await Promise.all((r.data.attachments ?? []).map(async (path) => {
      const { data } = await supabase.storage.from('customer-uploads').createSignedUrl(path, 600)
      return { path, name: path.split('/').pop(), url: data?.signedUrl ?? '' }
    }))
    setFiles(list)
  }, [id])

  useEffect(() => { load() }, [load])

  async function run(action, okText) {
    setBusy(true); setMsg(null)
    const { error } = await action()
    setBusy(false)
    if (error) { setMsg({ ok: false, text: friendlyDbError(error) }); return false }
    setMsg({ ok: true, text: okText }); await load(); return true
  }

  async function emailQuotation(q) {
    setBusy(true); setMsg(null)
    const out = await adminEmail({ type: 'quotation_send', quotation_id: q.id })
    setBusy(false)
    setMsg({ ok: Boolean(out.ok) && out.marked !== false, text: out.message || (out.ok ? 'Done.' : 'The email could not be sent.') })
    setMailKey((k) => k + 1)
    await load()
  }

  if (state.loading) return <p role="status">Loading request…</p>
  if (state.failed) return <p className="a-error" role="alert">Could not load this request. Refresh the page to try again.</p>
  if (state.missing) return <><p className="a-notice">This request was not found.</p><Link to="/admin/quotes">Back to quote requests</Link></>

  const r = state.request
  const options = manualStatuses(r.status)
  const waText = `Hello ${r.full_name}, this is DE DON DC about your quote request ${r.reference}.`
  const wa = whatsappUrl(r.phone, waText)

  const createQuotation = async (e) => {
    e.preventDefault()
    const errs = validateQuotation(form)
    setErrors(errs)
    if (Object.keys(errs).length) return
    const ok = await run(() => supabase.rpc('create_quotation', {
      p_request_id: r.id, p_amount: parseAmount(form.amount), p_currency: form.currency,
      p_description: form.description.trim(), p_expires_on: form.expires_on || null,
    }), 'Quotation created. You can now print it, send it yourself, then mark it as sent.')
    if (ok) setForm(EMPTY)
  }

  return (
    <>
      <p><Link to="/admin/quotes">← All quote requests</Link></p>
      <h1>{r.reference} <StatusBadge status={r.status} /></h1>
      {msg && <p className={msg.ok ? 'a-notice' : 'a-error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}

      <div className="a-cols">
        <section className="a-card" aria-labelledby="cust-h">
          <h2 id="cust-h">Customer</h2>
          <dl className="a-dl">
            <dt>Name</dt><dd>{r.full_name}</dd>
            <dt>Email</dt><dd><a href={`mailto:${r.email}`}>{r.email}</a></dd>
            <dt>Phone</dt><dd><a href={`tel:${r.phone.replace(/[^\d+]/g, '')}`}>{r.phone}</a>{wa && <> · <a href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a></>}</dd>
            <dt>Prefers</dt><dd>{r.preferred_contact}</dd>
            <dt>Received</dt><dd>{formatDateTime(r.created_at)}</dd>
          </dl>
        </section>
        <section className="a-card" aria-labelledby="req-h">
          <h2 id="req-h">Request</h2>
          <dl className="a-dl">
            <dt>Service</dt><dd>{r.services?.title ?? '—'}</dd>
            <dt>Property</dt><dd>{r.property_type}{r.property_size ? `, ${r.property_size}` : ''}</dd>
            <dt>Location</dt><dd>{r.location}</dd>
            <dt>Preferred date</dt><dd>{r.preferred_date ? formatDate(r.preferred_date) : 'Not given'}</dd>
          </dl>
          <p className="a-pre">{r.description}</p>
        </section>
      </div>

      <section className="a-card" aria-labelledby="att-h">
        <h2 id="att-h">Attachments</h2>
        {(r.attachments ?? []).length === 0 ? <p className="a-muted">The customer did not attach any files.</p> : (
          <ul className="a-files">
            {files.map((f) => (
              <li key={f.path}>{f.url ? <a href={f.url} target="_blank" rel="noopener noreferrer">{f.name}</a> : <span>{f.name} (could not be opened)</span>}</li>
            ))}
          </ul>
        )}
        <p className="a-muted a-hint">Files are private. Each link works for 10 minutes; refresh the page for new links.</p>
      </section>

      <section className="a-card" aria-labelledby="st-h">
        <h2 id="st-h">Status and notes</h2>
        <p>Current status: <StatusBadge status={r.status} /></p>
        {options.length > 0 && (
          <div className="a-row">
            <label htmlFor="ns">Change status to</label>
            <select id="ns" defaultValue="" disabled={busy} onChange={(e) => {
              const v = e.target.value; e.target.value = ''
              if (v) run(() => supabase.from('quote_requests').update({ status: v }).eq('id', r.id), `Status changed to ${statusLabel(QUOTE_STATUS, v)}.`)
            }}>
              <option value="">Choose…</option>
              {options.map((s) => <option key={s} value={s}>{statusLabel(QUOTE_STATUS, s)}</option>)}
            </select>
          </div>
        )}
        <p className="a-muted a-hint">“Quotation prepared” and “Quotation sent” are set automatically when you create and send a quotation below.</p>
        <label htmlFor="notes">Internal notes (never shown to the customer)</label>
        <textarea id="notes" rows="4" maxLength="4000" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button className="a-btn" disabled={busy || notes === (r.internal_notes ?? '')}
          onClick={() => run(() => supabase.from('quote_requests').update({ internal_notes: notes.trim() || null }).eq('id', r.id), 'Notes saved.')}>Save notes</button>
      </section>

      <section className="a-card" aria-labelledby="qt-h">
        <h2 id="qt-h">Quotations</h2>
        {state.quotations.length === 0 ? <p className="a-muted">No quotation yet.</p> : (
          <ul className="a-quotes">
            {state.quotations.map((q) => (
              <li key={q.id}>
                <div>
                  <strong>{q.reference}</strong> · {formatMoney(q.amount, q.currency)}
                  <br /><small>{q.sent_at ? `Marked as sent ${formatDateTime(q.sent_at)}` : 'Not sent yet'}{q.expires_on ? ` · valid until ${formatDate(q.expires_on)}` : ''}</small>
                  <p className="a-pre">{q.description}</p>
                </div>
                <div className="a-actions">
                  <Link className="a-btn a-btn-ghost" to={`/admin/quotes/${r.id}/quotation/${q.id}`}>View / print</Link>
                  {!q.sent_at && (
                    <>
                      <button className="a-btn" disabled={busy} onClick={() => {
                        if (window.confirm(`Email this quotation to ${r.email} now? It will be marked as sent, and a sent quotation can no longer be changed or deleted.`)) emailQuotation(q)
                      }}>Email to customer</button>
                      <button className="a-btn a-btn-ghost" disabled={busy} onClick={() => {
                        if (window.confirm('Mark this quotation as sent? Do this only after you have really sent it to the customer. A sent quotation can no longer be changed or deleted.'))
                          run(() => supabase.rpc('send_quotation', { p_quotation_id: q.id }), 'Quotation marked as sent.')
                      }}>I sent it myself</button>
                      <button className="a-btn a-btn-ghost" disabled={busy} onClick={() => {
                        if (window.confirm('Delete this unsent quotation?'))
                          run(() => supabase.rpc('delete_quotation', { p_quotation_id: q.id }), 'Quotation deleted.')
                      }}>Delete</button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="a-muted a-hint">“Email to customer” sends the quotation to {r.email} from the website and marks it as sent. If you sent it yourself another way (for example WhatsApp), press “I sent it myself”.</p>

        <h3>Create a quotation</h3>
        <form onSubmit={createQuotation} noValidate>
          <Field id="amount" label="Amount" error={errors.amount}>
            <input id="amount" inputMode="decimal" value={form.amount} aria-invalid={Boolean(errors.amount)} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="150000" />
          </Field>
          <Field id="currency" label="Currency" error={errors.currency}>
            <select id="currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field id="qdesc" label="What the price covers" error={errors.description}>
            <textarea id="qdesc" rows="5" maxLength="2000" value={form.description} aria-invalid={Boolean(errors.description)} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field id="exp" label="Valid until (optional)" error={errors.expires_on}>
            <input id="exp" type="date" value={form.expires_on} onChange={(e) => setForm({ ...form, expires_on: e.target.value })} />
          </Field>
          <button className="a-btn" disabled={busy}>Create quotation</button>
        </form>
      </section>

      <EmailHistory ids={[r.id, ...state.quotations.map((q) => q.id)]} refreshKey={mailKey} />
    </>
  )
}
