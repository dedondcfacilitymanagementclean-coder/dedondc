import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Field, ImageField } from '../components'
import { linesToList, listToLines, slugify, validateService } from '../lib/content'
import { removePicture, uploadPicture } from '../lib/storage'
import { useTitle } from '../useAdminHead'

const EMPTY = { title: '', slug: '', short_description: '', description: '', icon: '', benefits: '', is_published: true, image_path: '' }

export default function ServiceForm() {
  const { id } = useParams()
  const isNew = id === 'new'
  const nav = useNavigate()
  useTitle(isNew ? 'Add service' : 'Edit service')
  const [f, setF] = useState(EMPTY)
  const [loading, setLoading] = useState(!isNew)
  const [file, setFile] = useState(null)
  const [removeImg, setRemoveImg] = useState(false)
  const [errors, setErrors] = useState({})
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const slugTouched = useRef(!isNew)

  useEffect(() => {
    if (isNew) return
    supabase.from('services').select('*').eq('id', id).maybeSingle().then(({ data, error }) => {
      if (error || !data) setMsg({ ok: false, text: 'This service could not be loaded.' })
      else setF({ ...EMPTY, ...data, short_description: data.short_description ?? '', icon: data.icon ?? '', image_path: data.image_path ?? '', benefits: listToLines(data.benefits) })
      setLoading(false)
    })
  }, [id, isNew])

  const set = (k) => (e) => setF((p) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    const next = { ...p, [k]: v }
    if (k === 'title' && !slugTouched.current) next.slug = slugify(v)
    return next
  })

  async function save(e) {
    e.preventDefault()
    const errs = validateService(f)
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true); setMsg(null)
    try {
      let image_path = removeImg ? null : (f.image_path || null)
      const oldPath = f.image_path
      if (file) image_path = await uploadPicture(file, 'services')
      const row = {
        title: f.title.trim(), slug: f.slug, short_description: f.short_description.trim() || null,
        description: f.description.trim(), icon: f.icon.trim() || null, benefits: linesToList(f.benefits),
        is_published: f.is_published, image_path,
      }
      let error
      if (isNew) {
        const { data: last } = await supabase.from('services').select('sort_order').order('sort_order', { ascending: false }).limit(1)
        ;({ error } = await supabase.from('services').insert({ ...row, sort_order: (last?.[0]?.sort_order ?? 0) + 1 }))
      } else {
        ;({ error } = await supabase.from('services').update(row).eq('id', id))
      }
      if (error) {
        if (file && image_path) await removePicture(image_path)
        setMsg({ ok: false, text: error.code === '23505' ? 'Another service already uses this web address. Change the address.' : 'Could not save the service. Please try again.' })
        return
      }
      if ((file || removeImg) && oldPath && oldPath !== image_path) await removePicture(oldPath)
      nav('/admin/services')
    } catch {
      setMsg({ ok: false, text: 'The picture could not be uploaded. Try a different picture.' })
    } finally { setBusy(false) }
  }

  async function remove() {
    if (!window.confirm('Delete this service for good? If you only want to stop showing it, use Hide instead.')) return
    setBusy(true)
    const { error } = await supabase.from('services').delete().eq('id', id)
    setBusy(false)
    if (error) return setMsg({ ok: false, text: error.code === '23503' ? 'This service has quote requests or bookings, so it cannot be deleted. Untick “Show on the website” instead.' : 'Could not delete the service.' })
    await removePicture(f.image_path)
    nav('/admin/services')
  }

  if (loading) return <p role="status">Loading service…</p>
  return (
    <>
      <p><Link to="/admin/services">← All services</Link></p>
      <h1>{isNew ? 'Add a service' : 'Edit service'}</h1>
      {msg && <p className={msg.ok ? 'a-notice' : 'a-error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
      <form className="a-card" onSubmit={save} noValidate>
        <Field id="title" label="Title" error={errors.title}><input id="title" value={f.title} maxLength="120" onChange={set('title')} /></Field>
        <Field id="slug" label="Web address" error={errors.slug} hint={isNew ? 'Made from the title. Change it only if you must.' : 'Changing this breaks old links to this service.'}>
          <input id="slug" value={f.slug} maxLength="60" onChange={(e) => { slugTouched.current = true; set('slug')(e) }} />
        </Field>
        <Field id="short_description" label="Short summary (shown on cards)" error={errors.short_description}><input id="short_description" value={f.short_description} maxLength="160" onChange={set('short_description')} /></Field>
        <Field id="description" label="Full description" error={errors.description}><textarea id="description" rows="8" value={f.description} onChange={set('description')} /></Field>
        <Field id="benefits" label="Benefits (one per line)" error={errors.benefits}><textarea id="benefits" rows="5" value={f.benefits} onChange={set('benefits')} /></Field>
        <Field id="icon" label="Icon (optional emoji)" error={errors.icon}><input id="icon" value={f.icon} maxLength="8" onChange={set('icon')} /></Field>
        <ImageField id="image" label="Picture" current={removeImg ? '' : f.image_path} file={file}
          onFile={(fl, problem) => { setFile(fl); setRemoveImg(false); setErrors((p) => ({ ...p, image: problem })) }}
          onRemove={() => { setFile(null); setRemoveImg(true) }} error={errors.image} />
        <label className="a-check"><input type="checkbox" checked={f.is_published} onChange={set('is_published')} /> Show on the website</label>
        <div className="a-actions">
          <button className="a-btn" disabled={busy}>{busy ? 'Saving…' : 'Save service'}</button>
          {!isNew && <button type="button" className="a-btn a-btn-ghost" disabled={busy} onClick={remove}>Delete service</button>}
        </div>
      </form>
    </>
  )
}
