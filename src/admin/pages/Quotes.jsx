import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDateTime } from '../../lib/format'
import { QUOTE_STATUS } from '../lib/status'
import { PAGE_SIZE, safeSearch } from '../lib/quotes'
import { StatusBadge, describeError } from '../components'
import { useTitle } from '../useAdminHead'

export default function Quotes() {
  useTitle('Quote requests')
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || 'all'
  const q = params.get('q') || ''
  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1)
  const [text, setText] = useState(q)
  const [state, setState] = useState({ loading: true, error: null, rows: [], total: 0 })

  useEffect(() => {
    let active = true
    let query = supabase.from('quote_requests')
      .select('id,reference,full_name,email,phone,status,created_at,services(title)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
    if (status !== 'all') query = query.eq('status', status)
    const s = safeSearch(q)
    if (s) query = query.or(`full_name.ilike.%${s}%,email.ilike.%${s}%,reference.ilike.%${s}%,phone.ilike.%${s}%`)
    query.then(({ data, error, count }) => {
      if (active) setState({ loading: false, error: error ?? null, rows: data ?? [], total: count ?? 0 })
    })
    return () => { active = false }
  }, [status, q, page])

  const set = (changes) => {
    const next = new URLSearchParams(params)
    Object.entries({ page: '1', ...changes }).forEach(([k, v]) => (v && v !== 'all' && !(k === 'page' && v === '1') ? next.set(k, v) : next.delete(k)))
    setState((s) => ({ ...s, loading: true }))
    setParams(next)
  }
  const pages = Math.max(1, Math.ceil(state.total / PAGE_SIZE))

  return (
    <>
      <h1>Quote requests</h1>
      <form className="a-filters" role="search" onSubmit={(e) => { e.preventDefault(); set({ q: text.trim() }) }}>
        <div>
          <label htmlFor="qs">Search</label>
          <input id="qs" type="search" value={text} placeholder="Name, email, phone or reference" onChange={(e) => setText(e.target.value)} />
        </div>
        <div>
          <label htmlFor="qf">Status</label>
          <select id="qf" value={status} onChange={(e) => set({ status: e.target.value })}>
            <option value="all">All statuses</option>
            {Object.entries(QUOTE_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <button className="a-btn">Search</button>
        {(q || status !== 'all') && (
          <button type="button" className="a-btn a-btn-ghost" onClick={() => { setText(''); set({ q: '', status: 'all' }) }}>Clear</button>
        )}
      </form>

      {state.loading ? <p role="status">Loading requests…</p>
        : state.error ? <p className="a-error" role="alert">Could not load the requests. Refresh the page to try again. <small>{describeError(state.error)}</small></p>
        : state.rows.length === 0 ? <p className="a-notice">{q || status !== 'all' ? 'No requests match your search.' : 'No quote requests yet. They will appear here when customers send them.'}</p>
        : (
          <>
            <table className="a-table">
              <thead><tr><th>Reference</th><th>Customer</th><th>Service</th><th>Status</th><th>Received</th></tr></thead>
              <tbody>
                {state.rows.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Reference"><Link to={`/admin/quotes/${r.id}`}>{r.reference}</Link></td>
                    <td data-label="Customer"><strong>{r.full_name}</strong><br /><small>{r.email}</small></td>
                    <td data-label="Service">{r.services?.title ?? '—'}</td>
                    <td data-label="Status"><StatusBadge status={r.status} /></td>
                    <td data-label="Received">{formatDateTime(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <nav className="a-pager" aria-label="Pages">
              <button className="a-btn a-btn-ghost" disabled={page <= 1} onClick={() => set({ page: String(page - 1) })}>Previous</button>
              <span>Page {page} of {pages} · {state.total} request{state.total === 1 ? '' : 's'}</span>
              <button className="a-btn a-btn-ghost" disabled={page >= pages} onClick={() => set({ page: String(page + 1) })}>Next</button>
            </nav>
          </>
        )}
    </>
  )
}
