import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { excerpt } from '../../lib/format'
import { MoveButtons, PublishBadge, friendlyDbError } from '../components'
import { useTitle } from '../useAdminHead'

export default function Testimonials() {
  useTitle('Testimonials')
  const [state, setState] = useState({ loading: true, rows: [] })
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('testimonials').select('id,customer_name,customer_role,message,rating,is_published,sort_order').order('sort_order').order('created_at', { ascending: false })
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

  if (state.loading) return <p role="status">Loading testimonials…</p>
  if (state.failed) return <p className="a-error" role="alert">Could not load the testimonials. Refresh the page to try again.</p>
  return (
    <>
      <h1>Testimonials</h1>
      <p>Only publish real feedback from real clients. Hidden testimonials are not shown to visitors.</p>
      <Link className="a-btn" to="/admin/testimonials/new">Add a testimonial</Link>
      {msg && <p className={msg.ok ? 'a-notice' : 'a-error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
      {state.rows.length === 0 ? <p className="a-notice">No testimonials yet.</p> : (
        <table className="a-table">
          <thead><tr><th>Order</th><th>Client</th><th>Message</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {state.rows.map((t, i) => (
              <tr key={t.id}>
                <td data-label="Order"><MoveButtons disabled={busy} first={i === 0} last={i === state.rows.length - 1}
                  onUp={() => act(() => supabase.rpc('move_item', { p_table: 'testimonials', p_id: t.id, p_direction: 'up' }), 'Moved up.')}
                  onDown={() => act(() => supabase.rpc('move_item', { p_table: 'testimonials', p_id: t.id, p_direction: 'down' }), 'Moved down.')} /></td>
                <td data-label="Client"><strong>{t.customer_name}</strong>{t.customer_role && <><br /><small>{t.customer_role}</small></>}{t.rating ? <><br /><small>{'★'.repeat(t.rating)}</small></> : null}</td>
                <td data-label="Message">{excerpt(t.message, 90)}</td>
                <td data-label="Status"><PublishBadge published={t.is_published} /></td>
                <td data-label="Actions"><div className="a-actions">
                  <Link className="a-btn a-btn-ghost" to={`/admin/testimonials/${t.id}`}>Edit</Link>
                  <button className="a-btn a-btn-ghost" disabled={busy}
                    onClick={() => act(() => supabase.from('testimonials').update({ is_published: !t.is_published }).eq('id', t.id), t.is_published ? 'Testimonial hidden.' : 'Testimonial published.')}>
                    {t.is_published ? 'Hide' : 'Publish'}</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
