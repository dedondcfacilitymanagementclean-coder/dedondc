import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { MoveButtons, PublishBadge, friendlyDbError } from '../components'
import { useTitle } from '../useAdminHead'

export default function Services() {
  useTitle('Services')
  const [state, setState] = useState({ loading: true, rows: [] })
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('services').select('id,title,slug,is_published,sort_order').order('sort_order').order('created_at')
    setState({ loading: false, failed: Boolean(error), rows: data ?? [] })
  }, [])
  useEffect(() => { load() }, [load])

  async function act(fn, ok) {
    setBusy(true); setMsg(null)
    const { error } = await fn()
    setBusy(false)
    if (error) return setMsg({ ok: false, text: friendlyDbError(error) })
    setMsg({ ok: true, text: ok }); load()
  }

  if (state.loading) return <p role="status">Loading services…</p>
  if (state.failed) return <p className="a-error" role="alert">Could not load the services. Refresh the page to try again.</p>
  return (
    <>
      <h1>Services</h1>
      <p>These appear on the Services page and in the quote and booking forms, in this order. Hidden services are not shown to visitors.</p>
      <Link className="a-btn" to="/admin/services/new">Add a service</Link>
      {msg && <p className={msg.ok ? 'a-notice' : 'a-error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
      <table className="a-table">
        <thead><tr><th>Order</th><th>Service</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {state.rows.map((s, i) => (
            <tr key={s.id}>
              <td data-label="Order"><MoveButtons disabled={busy} first={i === 0} last={i === state.rows.length - 1}
                onUp={() => act(() => supabase.rpc('move_item', { p_table: 'services', p_id: s.id, p_direction: 'up' }), 'Moved up.')}
                onDown={() => act(() => supabase.rpc('move_item', { p_table: 'services', p_id: s.id, p_direction: 'down' }), 'Moved down.')} /></td>
              <td data-label="Service"><strong>{s.title}</strong><br /><small>/{s.slug}</small></td>
              <td data-label="Status"><PublishBadge published={s.is_published} /></td>
              <td data-label="Actions">
                <div className="a-actions">
                  <Link className="a-btn a-btn-ghost" to={`/admin/services/${s.id}`}>Edit</Link>
                  <button className="a-btn a-btn-ghost" disabled={busy}
                    onClick={() => act(() => supabase.from('services').update({ is_published: !s.is_published }).eq('id', s.id), s.is_published ? 'Service hidden.' : 'Service published.')}>
                    {s.is_published ? 'Hide' : 'Publish'}</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
