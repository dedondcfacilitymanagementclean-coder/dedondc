import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDateTime } from '../../lib/format'
import { humanize } from '../lib/status'
import { useAuth } from '../AuthContext'
import { useTitle } from '../useAdminHead'

const PAGE = 25
const ENTITIES = ['quote_request', 'quotation', 'booking', 'contact_enquiry', 'service', 'project', 'testimonial', 'site_setting', 'profile']

export function describeDetails(d = {}) {
  const bits = []
  if (d.reference) bits.push(d.reference)
  if (d.title) bits.push(d.title)
  if (d.key) bits.push(humanize(d.key))
  if (d.from && d.to) bits.push(`${humanize(d.from)} → ${humanize(d.to)}`)
  else if (d.to) bits.push(humanize(d.to))
  if (d.direction) bits.push(`moved ${d.direction}`)
  return bits.join(' · ')
}

export default function ActivityLog() {
  useTitle('Activity log')
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const entity = params.get('entity') || 'all'
  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1)
  const [state, setState] = useState({ loading: true, rows: [], total: 0 })

  useEffect(() => {
    let active = true
    let q = supabase.from('activity_logs').select('id,action,entity,details,actor_id,created_at', { count: 'exact' })
      .order('created_at', { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1)
    if (entity !== 'all') q = q.eq('entity', entity)
    q.then(({ data, error, count }) => { if (active) setState({ loading: false, failed: Boolean(error), rows: data ?? [], total: count ?? 0 }) })
    return () => { active = false }
  }, [entity, page])

  const set = (changes) => {
    const next = new URLSearchParams(params)
    Object.entries({ page: '1', ...changes }).forEach(([k, v]) => (v && v !== 'all' && !(k === 'page' && v === '1') ? next.set(k, v) : next.delete(k)))
    setState((s) => ({ ...s, loading: true })); setParams(next)
  }
  const pages = Math.max(1, Math.ceil(state.total / PAGE))

  return (
    <>
      <h1>Activity log</h1>
      <p>A record of changes made in the dashboard. It never shows passwords or customers’ personal details.</p>
      <div className="a-filters">
        <div><label htmlFor="ae">Show</label>
          <select id="ae" value={entity} onChange={(e) => set({ entity: e.target.value })}>
            <option value="all">Everything</option>
            {ENTITIES.map((x) => <option key={x} value={x}>{humanize(x)}</option>)}
          </select></div>
      </div>
      {state.loading ? <p role="status">Loading activity…</p>
        : state.failed ? <p className="a-error" role="alert">Could not load the activity log. Refresh the page to try again.</p>
        : state.rows.length === 0 ? <p className="a-notice">Nothing recorded yet.</p> : (
          <>
            <table className="a-table">
              <thead><tr><th>When</th><th>What happened</th><th>Details</th><th>Who</th></tr></thead>
              <tbody>
                {state.rows.map((r) => (
                  <tr key={r.id}>
                    <td data-label="When">{formatDateTime(r.created_at)}</td>
                    <td data-label="What happened"><strong>{humanize(r.action)}</strong><br /><small>{humanize(r.entity)}</small></td>
                    <td data-label="Details">{describeDetails(r.details) || '—'}</td>
                    <td data-label="Who">{r.actor_id === user?.id ? 'You' : r.actor_id ? 'Administrator' : 'System'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <nav className="a-pager" aria-label="Pages">
              <button className="a-btn a-btn-ghost" disabled={page <= 1} onClick={() => set({ page: String(page - 1) })}>Previous</button>
              <span>Page {page} of {pages} · {state.total} entr{state.total === 1 ? 'y' : 'ies'}</span>
              <button className="a-btn a-btn-ghost" disabled={page >= pages} onClick={() => set({ page: String(page + 1) })}>Next</button>
            </nav>
          </>
        )}
    </>
  )
}
