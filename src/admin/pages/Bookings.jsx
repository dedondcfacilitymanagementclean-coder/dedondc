import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDate } from '../../lib/format'
import { BOOKING_STATUS } from '../lib/status'
import { PAGE_SIZE, safeSearch } from '../lib/quotes'
import { StatusBadge } from '../components'
import { useTitle } from '../useAdminHead'

export default function Bookings() {
  useTitle('Bookings')
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || 'all'
  const q = params.get('q') || ''
  const sort = params.get('sort') === 'date' ? 'date' : 'new'
  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1)
  const [text, setText] = useState(q)
  const [state, setState] = useState({ loading: true, error: false, rows: [], total: 0 })

  useEffect(() => {
    let active = true
    // FIX: Adjust the column inside services(...) to match your actual services table schema
    let query = supabase.from('service_bookings')
      .select('id,reference_number,full_name,email,phone,status,preferred_date,preferred_time,created_at,services(title)', { count: 'exact' })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
      
    query = sort === 'date' ? query.order('preferred_date', { ascending: true }) : query.order('created_at', { ascending: false })
    
    if (status !== 'all') query = query.eq('status', status)
    
    const s = safeSearch(q)
    if (s) query = query.or(`full_name.ilike.%${s}%,email.ilike.%${s}%,reference_number.ilike.%${s}%,phone.ilike.%${s}%`)
    
    query.then(({ data, error, count }) => {
      if (active) {
        if (error) console.error("Supabase fetch error:", error)
        setState({ loading: false, error: Boolean(error), rows: data ?? [], total: count ?? 0 })
      }
    })
    
    return () => { active = false }
  }, [status, q, sort, page])

  const set = (changes) => {
    const next = new URLSearchParams(params)
    Object.entries({ page: '1', ...changes }).forEach(([k, v]) => (v && v !== 'all' && v !== 'new' && !(k === 'page' && v === '1') ? next.set(k, v) : next.delete(k)))
    setState((s) => ({ ...s, loading: true }))
    setParams(next)
  }
  const pages = Math.max(1, Math.ceil(state.total / PAGE_SIZE))

  return (
    <>
      <h1>Bookings</h1>
      <form className="a-filters" role="search" onSubmit={(e) => { e.preventDefault(); set({ q: text.trim() }) }}>
        <div>
          <label htmlFor="bs">Search</label>
          <input id="bs" type="search" value={text} placeholder="Name, email, phone or reference" onChange={(e) => setText(e.target.value)} />
        </div>
        <div>
          <label htmlFor="bf">Status</label>
          <select id="bf" value={status} onChange={(e) => set({ status: e.target.value })}>
            <option value="all">All statuses</option>
            {Object.entries(BOOKING_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="bo">Order by</label>
          <select id="bo" value={sort} onChange={(e) => set({ sort: e.target.value })}>
            <option value="new">Newest first</option>
            <option value="date">Service date (earliest first)</option>
          </select>
        </div>
        <button className="a-btn">Search</button>
        {(q || status !== 'all') && (
          <button type="button" className="a-btn a-btn-ghost" onClick={() => { setText(''); set({ q: '', status: 'all' }) }}>Clear</button>
        )}
      </form>

      {state.loading ? <p role="status">Loading bookings…</p>
        : state.error ? <p className="a-error" role="alert">Could not load the bookings. Refresh the page to try again.</p>
        : state.rows.length === 0 ? <p className="a-notice">{q || status !== 'all' ? 'No bookings match your search.' : 'No bookings yet. They will appear here when customers book a service.'}</p>
        : (
          <>
            <table className="a-table">
              <thead><tr><th>Reference</th><th>Customer</th><th>Service</th><th>Requested for</th><th>Status</th></tr></thead>
              <tbody>
                {state.rows.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Reference"><Link to={`/admin/bookings/${r.id}`}>{r.reference_number}</Link></td>
                    <td data-label="Customer"><strong>{r.full_name}</strong><br /><small>{r.email}</small></td>
                    {/* FIX: Adjust this fallback to match the column returned in the query above */}
                    <td data-label="Service">{r.services?.title ?? r.services?.name ?? '—'}</td>
                    <td data-label="Requested for">{formatDate(r.preferred_date)}<br /><small>{r.preferred_time}</small></td>
                    <td data-label="Status"><StatusBadge status={r.status} map={BOOKING_STATUS} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <nav className="a-pager" aria-label="Pages">
              <button className="a-btn a-btn-ghost" disabled={page <= 1} onClick={() => set({ page: String(page - 1) })}>Previous</button>
              <span>Page {page} of {pages} · {state.total} booking{state.total === 1 ? '' : 's'}</span>
              <button className="a-btn a-btn-ghost" disabled={page >= pages} onClick={() => set({ page: String(page + 1) })}>Next</button>
            </nav>
          </>
        )}
    </>
  )
}