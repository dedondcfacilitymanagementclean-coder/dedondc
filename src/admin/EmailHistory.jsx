import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDateTime } from '../lib/format'

const LABELS = {
  quote_customer: 'Confirmation to customer', quote_admin: 'Alert to the business',
  booking_customer: 'Confirmation to customer', booking_admin: 'Alert to the business',
  contact_customer: 'Confirmation to customer', contact_admin: 'Alert to the business',
  quotation: 'Quotation',
  booking_confirmed: 'Booking confirmed', booking_reschedule_proposed: 'New time suggested',
  booking_declined: 'Booking declined', booking_cancelled: 'Booking cancelled',
}
const OUTCOME = { sent: 'Sent', failed: 'Failed', not_configured: 'Not sent (email not set up)' }

// Shows every email the system has tried to send about this record, so nobody has to guess.
export default function EmailHistory({ ids, refreshKey = 0 }) {
  const [rows, setRows] = useState(null)
  const key = (ids ?? []).join(',')
  useEffect(() => {
    let live = true
    if (!key) { setRows([]); return }
    supabase.from('email_logs').select('id,to_email,template,status,created_at').in('related_id', key.split(',')).order('created_at', { ascending: false }).limit(20)
      .then(({ data, error }) => { if (live) setRows(error ? 'error' : data ?? []) })
    return () => { live = false }
  }, [key, refreshKey])

  return (
    <section className="a-card" aria-labelledby="em-h">
      <h2 id="em-h">Emails sent about this</h2>
      {rows === null && <p className="a-muted">Loading…</p>}
      {rows === 'error' && <p className="a-muted">The email history could not be loaded.</p>}
      {Array.isArray(rows) && rows.length === 0 && <p className="a-muted">No emails yet.</p>}
      {Array.isArray(rows) && rows.length > 0 && (
        <ul className="a-files">
          {rows.map((r) => (
            <li key={r.id}>
              <strong>{LABELS[r.template] ?? r.template}</strong> → {r.to_email}<br />
              <small className={r.status === 'sent' ? '' : 'a-error-text'}>{OUTCOME[r.status] ?? r.status} · {formatDateTime(r.created_at)}</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
