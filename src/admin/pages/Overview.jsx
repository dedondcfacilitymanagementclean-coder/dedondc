import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../AuthContext'
import { formatDateTime } from '../../lib/format'
import { BOOKING_STATUS, QUOTE_STATUS, humanize, statusLabel } from '../lib/status'
import { useTitle } from '../useAdminHead'

const count = (table, filter) => {
  let q = supabase.from(table).select('id', { count: 'exact', head: true })
  if (filter) q = filter(q)
  return q
}

async function loadOverview() {
  const [quotes, newQuotes, pending, confirmed, unread, recentQ, recentB, activity] = await Promise.all([
    count('quote_requests'),
    count('quote_requests', (q) => q.eq('status', 'new')),
    // FIXED: Changed 'bookings' to 'service_bookings'
    count('service_bookings', (q) => q.eq('status', 'pending_review')),
    count('service_bookings', (q) => q.eq('status', 'confirmed')),
    count('contact_enquiries', (q) => q.eq('status', 'unread').eq('archived', false)),
    // FIXED: Quote table uses 'reference' (as we set up earlier)
    supabase.from('quote_requests').select('id,reference,full_name,status,created_at').order('created_at', { ascending: false }).limit(5),
    // FIXED: Changed table to 'service_bookings' and column to 'reference_number'
    supabase.from('service_bookings').select('id,reference_number,full_name,status,created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('activity_logs').select('id,actor_id,action,entity,created_at').order('created_at', { ascending: false }).limit(8),
  ])
  
  const all = [quotes, newQuotes, pending, confirmed, unread, recentQ, recentB, activity]
  const n = (r) => (r.error ? null : r.count ?? 0)
  
  const recent = [
    ...(recentQ.data ?? []).map((r) => ({ ...r, kind: 'Quote', label: statusLabel(QUOTE_STATUS, r.status) })),
    // FIXED: Map reference_number to reference so the rest of the component can render it easily
    ...(recentB.data ?? []).map((r) => ({ ...r, reference: r.reference_number, kind: 'Booking', label: statusLabel(BOOKING_STATUS, r.status) })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8)

  return {
    failed: all.some((r) => r.error),
    counts: { quotes: n(quotes), newQuotes: n(newQuotes), pending: n(pending), confirmed: n(confirmed), unread: n(unread) },
    recent, activity: activity.data ?? [],
  }
}

function Tile({ label, value }) {
  return (
    <div className="a-tile">
      <p className="a-tile-n">{value ?? '—'}</p>
      <p className="a-tile-l">{label}</p>
    </div>
  )
}

export default function Overview() {
  useTitle('Overview')
  const { user } = useAuth()
  const [state, setState] = useState({ loading: true })

  useEffect(() => {
    let active = true
    loadOverview().then((r) => active && setState({ loading: false, ...r }))
      .catch(() => active && setState({ loading: false, failed: true, counts: {}, recent: [], activity: [] }))
    return () => { active = false }
  }, [])

  if (state.loading) return <p role="status">Loading your overview…</p>
  const c = state.counts
  
  return (
    <>
      <h1>Overview</h1>
      {state.failed && <p className="a-error" role="alert">Some figures could not be loaded and show a dash. Refresh the page to try again.</p>}
      <div className="a-tiles">
        <Link to="/admin/quotes" className="a-tile-link"><Tile label="Total quotation requests" value={c.quotes} /></Link>
        <Link to="/admin/quotes?status=new" className="a-tile-link"><Tile label="New quotation requests" value={c.newQuotes} /></Link>
        <Link to="/admin/bookings?status=pending_review" className="a-tile-link"><Tile label="Bookings pending review" value={c.pending} /></Link>
        <Link to="/admin/bookings?status=confirmed" className="a-tile-link"><Tile label="Confirmed bookings" value={c.confirmed} /></Link>
        <Link to="/admin/enquiries?status=unread" className="a-tile-link"><Tile label="Unread contact enquiries" value={c.unread} /></Link>
      </div>

      <div className="a-cols">
        <section className="a-card" aria-labelledby="recent-h">
          <h2 id="recent-h">Recently received</h2>
          {state.recent.length === 0 ? <p className="a-muted">No requests yet. They will appear here as customers send them.</p> : (
            <ul className="a-list">
              {state.recent.map((r) => (
                <li key={r.kind + r.id}>
                  <span className={'a-badge ' + (r.kind === 'Quote' ? 'q' : 'b')}>{r.kind}</span>
                  <span><strong>{r.full_name}</strong><br /><small><Link to={`/admin/${r.kind === 'Quote' ? 'quotes' : 'bookings'}/${r.id}`}>{r.reference}</Link> · {r.label}</small></span>
                  <time dateTime={r.created_at}>{formatDateTime(r.created_at)}</time>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="a-card" aria-labelledby="act-h">
          <h2 id="act-h">Recent activity</h2>
          {state.activity.length === 0 ? <p className="a-muted">No administrative activity recorded yet.</p> : (
            <ul className="a-list">
              {state.activity.map((a) => (
                <li key={a.id}>
                  <span><strong>{humanize(a.action)}</strong><br /><small>{humanize(a.entity)} · {a.actor_id === user?.id ? 'You' : 'Administrator'}</small></span>
                  <time dateTime={a.created_at}>{formatDateTime(a.created_at)}</time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="a-notice">Everything is managed from the menu on the left.</p>
    </>
  )
}