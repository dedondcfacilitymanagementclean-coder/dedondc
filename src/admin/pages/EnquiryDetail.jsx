import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDateTime } from '../../lib/format'
import { whatsappUrl } from '../lib/quotes'
import { StatusBadge, friendlyDbError } from '../components'
import { ENQUIRY_STATUS } from './Enquiries'
import { useTitle } from '../useAdminHead'
import EmailHistory from '../EmailHistory'

export default function EnquiryDetail() {
  const { id } = useParams()
  useTitle('Enquiry')
  const [state, setState] = useState({ loading: true })
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notes, setNotes] = useState('')
  const opened = useRef(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('contact_enquiries').select('*').eq('id', id).maybeSingle()
    if (error) return setState({ loading: false, failed: true })
    if (!data) return setState({ loading: false, missing: true })
    setNotes(data.internal_notes ?? '')
    setState({ loading: false, e: data })
    // Opening an unread message marks it as read (once).
    if (data.status === 'unread' && !opened.current) {
      opened.current = true
      const r = await supabase.from('contact_enquiries').update({ status: 'read' }).eq('id', id)
      if (!r.error) setState({ loading: false, e: { ...data, status: 'read' } })
    }
  }, [id])
  useEffect(() => { load() }, [load])

  async function update(changes, okText) {
    setBusy(true); setMsg(null)
    const { error } = await supabase.from('contact_enquiries').update(changes).eq('id', id)
    setBusy(false)
    if (error) return setMsg({ ok: false, text: friendlyDbError(error) })
    setMsg({ ok: true, text: okText }); load()
  }

  if (state.loading) return <p role="status">Loading message…</p>
  if (state.failed) return <p className="a-error" role="alert">Could not load this message. Refresh the page to try again.</p>
  if (state.missing) return <><p className="a-notice">This message was not found.</p><Link to="/admin/enquiries">Back to enquiries</Link></>
  const e = state.e
  const wa = e.phone ? whatsappUrl(e.phone, `Hello ${e.name}, this is DE DON DC replying to your message "${e.subject}".`) : ''

  return (
    <>
      <p><Link to="/admin/enquiries">← All enquiries</Link></p>
      <h1>{e.subject} <StatusBadge status={e.status} map={ENQUIRY_STATUS} /></h1>
      {msg && <p className={msg.ok ? 'a-notice' : 'a-error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
      <section className="a-card">
        <dl className="a-dl">
          <dt>From</dt><dd>{e.name}</dd>
          <dt>Email</dt><dd><a href={`mailto:${e.email}?subject=${encodeURIComponent('Re: ' + e.subject)}`}>{e.email}</a></dd>
          {e.phone && <><dt>Phone</dt><dd><a href={`tel:${e.phone.replace(/[^\d+]/g, '')}`}>{e.phone}</a>{wa && <> · <a href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a></>}</dd></>}
          <dt>Received</dt><dd>{formatDateTime(e.created_at)}</dd>
        </dl>
        <h2>Message</h2>
        <p className="a-pre">{e.message}</p>
        <div className="a-actions">
          {e.status !== 'resolved' && <button className="a-btn" disabled={busy} onClick={() => update({ status: 'resolved' }, 'Marked as resolved.')}>Mark as resolved</button>}
          {e.status !== 'unread' && <button className="a-btn a-btn-ghost" disabled={busy} onClick={() => update({ status: 'unread' }, 'Marked as unread.')}>Mark as unread</button>}
          <button className="a-btn a-btn-ghost" disabled={busy} onClick={() => update({ archived: !e.archived }, e.archived ? 'Moved back to active.' : 'Archived.')}>{e.archived ? 'Move back to active' : 'Archive'}</button>
        </div>
      </section>
      <section className="a-card">
        <label htmlFor="en">Internal notes (never shown to the customer)</label>
        <textarea id="en" rows="4" maxLength="4000" value={notes} onChange={(ev) => setNotes(ev.target.value)} />
        <button className="a-btn" disabled={busy || notes === (e.internal_notes ?? '')} onClick={() => update({ internal_notes: notes.trim() || null }, 'Notes saved.')}>Save notes</button>
      </section>

      <EmailHistory ids={[e.id]} />
    </>
  )
}
