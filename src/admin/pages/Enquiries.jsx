import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDateTime } from '../../lib/format'
import { PAGE_SIZE, safeSearch } from '../lib/quotes'
import { StatusBadge, describeError } from '../components'
import { useTitle } from '../useAdminHead'

export const ENQUIRY_STATUS = { unread: 'Unread', read: 'Read', resolved: 'Resolved' }

export default function Enquiries() {
  useTitle('Contact enquiries')
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || 'all'
  const q = params.get('q') || ''
  const archived = params.get('archived') === '1'
  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1)
  const [text, setText] = useState(q)
  const [state, setState] = useState({ loading: true, error: null, rows: [], total: 0 })

  useEffect(() => {
    let active = true
    let query = supabase.from('contact_enquiries')
      .select('id,name,email,subject,status,created_at', { count: 'exact' })
      .eq('archived', archived).order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
    if (status !== 'all') query = query.eq('status', status)
    const s = safeSearch(q)
    if (s) query = query.or(`name.ilike.%${s}%,email.ilike.%${s}%,subject.ilike.%${s}%`)
    query.then(({ data, error, count }) => {
      if (active) setState({ loading: false, error: error ?? null, rows: data ?? [], total: count ?? 0 })
    })
    return () => { active = false }
  }, [status, q, archived, page])

  const set = (changes) => {
    const next = new URLSearchParams(params)
    Object.entries({ page: '1', ...changes }).forEach(([k, v]) => (v && v !== 'all' && !(k === 'page' && v === '1') ? next.set(k, v) : next.delete(k)))
    setState((s) => ({ ...s, loading: true }))
    setParams(next)
  }
  const pages = Math.max(1, Math.ceil(state.total / PAGE_SIZE))

  return (
    <>
      <h1>Contact enquiries</h1>
      <form className="a-filters" role="search" onSubmit={(e) => { e.preventDefault(); set({ q: text.trim() }) }}>
        <div><label htmlFor="es">Search</label>
          <input id="es" type="search" value={text} placeholder="Name, email or subject" onChange={(e) => setText(e.target.value)} /></div>
        <div><label htmlFor="ef">Status</label>
          <select id="ef" value={status} onChange={(e) => set({ status: e.target.value })}>
            <option value="all">All statuses</option>
            {Object.entries(ENQUIRY_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></div>
        <div><label htmlFor="ea">Show</label>
          <select id="ea" value={archived ? '1' : '0'} onChange={(e) => set({ archived: e.target.value === '1' ? '1' : '' })}>
            <option value="0">Active</option><option value="1">Archived</option>
          </select></div>
        <button className="a-btn">Search</button>
      </form>

      {state.loading ? <p role="status">Loading enquiries…</p>
        : state.error ? <p className="a-error" role="alert">Could not load the enquiries. Refresh the page to try again. <small>{describeError(state.error)}</small></p>
        : state.rows.length === 0 ? <p className="a-notice">{q || status !== 'all' || archived ? 'No enquiries match.' : 'No messages yet. They appear here when someone uses the Contact form.'}</p>
        : (
          <>
            <table className="a-table">
              <thead><tr><th>From</th><th>Subject</th><th>Status</th><th>Received</th></tr></thead>
              <tbody>
                {state.rows.map((r) => (
                  <tr key={r.id} className={r.status === 'unread' ? 'a-unread' : ''}>
                    <td data-label="From"><strong>{r.name}</strong><br /><small>{r.email}</small></td>
                    <td data-label="Subject"><Link to={`/admin/enquiries/${r.id}`}>{r.subject}</Link></td>
                    <td data-label="Status"><StatusBadge status={r.status} map={ENQUIRY_STATUS} /></td>
                    <td data-label="Received">{formatDateTime(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <nav className="a-pager" aria-label="Pages">
              <button className="a-btn a-btn-ghost" disabled={page <= 1} onClick={() => set({ page: String(page - 1) })}>Previous</button>
              <span>Page {page} of {pages} · {state.total} message{state.total === 1 ? '' : 's'}</span>
              <button className="a-btn a-btn-ghost" disabled={page >= pages} onClick={() => set({ page: String(page + 1) })}>Next</button>
            </nav>
          </>
        )}
    </>
  )
}
