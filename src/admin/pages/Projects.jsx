import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { serviceImageUrl } from '../../lib/useServices'
import { MoveButtons, PublishBadge, friendlyDbError } from '../components'
import { useTitle } from '../useAdminHead'

export default function Projects() {
  useTitle('Projects')
  const [state, setState] = useState({ loading: true, rows: [] })
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('projects').select('id,title,location,image_path,is_published,sort_order,services(title)').order('sort_order').order('created_at', { ascending: false })
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

  if (state.loading) return <p role="status">Loading projects…</p>
  if (state.failed) return <p className="a-error" role="alert">Could not load the projects. Refresh the page to try again.</p>
  return (
    <>
      <h1>Projects</h1>
      <p>Photos of real jobs you have done. Only add pictures of your own work. Hidden projects are not shown to visitors.</p>
      <Link className="a-btn" to="/admin/projects/new">Add a project</Link>
      {msg && <p className={msg.ok ? 'a-notice' : 'a-error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
      {state.rows.length === 0 ? <p className="a-notice">No projects yet. Add your first project photo.</p> : (
        <table className="a-table">
          <thead><tr><th>Order</th><th>Photo</th><th>Project</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {state.rows.map((p, i) => (
              <tr key={p.id}>
                <td data-label="Order"><MoveButtons disabled={busy} first={i === 0} last={i === state.rows.length - 1}
                  onUp={() => act(() => supabase.rpc('move_item', { p_table: 'projects', p_id: p.id, p_direction: 'up' }), 'Moved up.')}
                  onDown={() => act(() => supabase.rpc('move_item', { p_table: 'projects', p_id: p.id, p_direction: 'down' }), 'Moved down.')} /></td>
                <td data-label="Photo"><img className="a-thumb" src={serviceImageUrl(p.image_path)} alt="" loading="lazy" /></td>
                <td data-label="Project"><strong>{p.title}</strong><br /><small>{[p.services?.title, p.location].filter(Boolean).join(' · ')}</small></td>
                <td data-label="Status"><PublishBadge published={p.is_published} /></td>
                <td data-label="Actions"><div className="a-actions">
                  <Link className="a-btn a-btn-ghost" to={`/admin/projects/${p.id}`}>Edit</Link>
                  <button className="a-btn a-btn-ghost" disabled={busy}
                    onClick={() => act(() => supabase.from('projects').update({ is_published: !p.is_published }).eq('id', p.id), p.is_published ? 'Project hidden.' : 'Project published.')}>
                    {p.is_published ? 'Hide' : 'Publish'}</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
