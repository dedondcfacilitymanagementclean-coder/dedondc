import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Field, ImageField } from '../components'
import { validateProject } from '../lib/content'
import { removePicture, uploadPicture } from '../lib/storage'
import { useTitle } from '../useAdminHead'

const EMPTY = { title: '', description: '', service_id: '', location: '', completed_on: '', image_path: '', is_published: false }

export default function ProjectForm() {
  const { id } = useParams()
  const isNew = id === 'new'
  const nav = useNavigate()
  useTitle(isNew ? 'Add project' : 'Edit project')
  const [f, setF] = useState(EMPTY)
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(!isNew)
  const [file, setFile] = useState(null)
  const [errors, setErrors] = useState({})
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.from('services').select('id,title').order('sort_order').then(({ data }) => setServices(data ?? []))
    if (isNew) return
    supabase.from('projects').select('*').eq('id', id).maybeSingle().then(({ data, error }) => {
      if (error || !data) setMsg({ ok: false, text: 'This project could not be loaded.' })
      else setF({ ...EMPTY, ...data, service_id: data.service_id ?? '', location: data.location ?? '', completed_on: data.completed_on ?? '' })
      setLoading(false)
    })
  }, [id, isNew])

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  async function save(e) {
    e.preventDefault()
    const errs = validateProject(f, Boolean(file || f.image_path))
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true); setMsg(null)
    try {
      const oldPath = f.image_path
      const image_path = file ? await uploadPicture(file, 'projects') : f.image_path
      const row = {
        title: f.title.trim(), description: f.description.trim(), service_id: f.service_id || null,
        location: f.location.trim() || null, completed_on: f.completed_on || null, image_path, is_published: f.is_published,
      }
      let error
      if (isNew) {
        const { data: last } = await supabase.from('projects').select('sort_order').order('sort_order', { ascending: false }).limit(1)
        ;({ error } = await supabase.from('projects').insert({ ...row, sort_order: (last?.[0]?.sort_order ?? 0) + 1 }))
      } else ({ error } = await supabase.from('projects').update(row).eq('id', id))
      if (error) {
        if (file) await removePicture(image_path)
        return setMsg({ ok: false, text: 'Could not save the project. Please try again.' })
      }
      if (file && oldPath) await removePicture(oldPath)
      nav('/admin/projects')
    } catch {
      setMsg({ ok: false, text: 'The picture could not be uploaded. Try a different picture.' })
    } finally { setBusy(false) }
  }

  async function remove() {
    if (!window.confirm('Delete this project and its photo for good? If you only want to stop showing it, use Hide instead.')) return
    setBusy(true)
    const { error } = await supabase.from('projects').delete().eq('id', id)
    setBusy(false)
    if (error) return setMsg({ ok: false, text: 'Could not delete the project.' })
    await removePicture(f.image_path)
    nav('/admin/projects')
  }

  if (loading) return <p role="status">Loading project…</p>
  return (
    <>
      <p><Link to="/admin/projects">← All projects</Link></p>
      <h1>{isNew ? 'Add a project' : 'Edit project'}</h1>
      {msg && <p className={msg.ok ? 'a-notice' : 'a-error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
      <form className="a-card" onSubmit={save} noValidate>
        <ImageField id="pimage" label="Photo of the job" current={f.image_path} file={file}
          onFile={(fl, problem) => { setFile(fl); setErrors((p) => ({ ...p, image: problem })) }} error={errors.image} />
        <Field id="ptitle" label="Title" error={errors.title}><input id="ptitle" value={f.title} maxLength="160" onChange={set('title')} /></Field>
        <Field id="pdesc" label="What was done (optional)" error={errors.description}><textarea id="pdesc" rows="4" value={f.description} onChange={set('description')} /></Field>
        <Field id="pservice" label="Service (optional)">
          <select id="pservice" value={f.service_id} onChange={set('service_id')}>
            <option value="">Not linked to a service</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </Field>
        <Field id="ploc" label="Location (optional)" error={errors.location}><input id="ploc" value={f.location} maxLength="120" onChange={set('location')} /></Field>
        <Field id="pdate" label="Date completed (optional)" error={errors.completed_on}><input id="pdate" type="date" value={f.completed_on} onChange={set('completed_on')} /></Field>
        <label className="a-check"><input type="checkbox" checked={f.is_published} onChange={set('is_published')} /> Show on the website</label>
        <div className="a-actions">
          <button className="a-btn" disabled={busy}>{busy ? 'Saving…' : 'Save project'}</button>
          {!isNew && <button type="button" className="a-btn a-btn-ghost" disabled={busy} onClick={remove}>Delete project</button>}
        </div>
      </form>
    </>
  )
}
