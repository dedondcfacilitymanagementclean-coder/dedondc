import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Field } from '../components'
import { validateTestimonial } from '../lib/content'
import { useTitle } from '../useAdminHead'

const EMPTY = { customer_name: '', customer_role: '', message: '', rating: '', is_published: false }

export default function TestimonialForm() {
  const { id } = useParams()
  const isNew = id === 'new'
  const nav = useNavigate()
  useTitle(isNew ? 'Add testimonial' : 'Edit testimonial')
  const [f, setF] = useState(EMPTY)
  const [loading, setLoading] = useState(!isNew)
  const [errors, setErrors] = useState({})
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (isNew) return
    supabase.from('testimonials').select('*').eq('id', id).maybeSingle().then(({ data, error }) => {
      if (error || !data) setMsg({ ok: false, text: 'This testimonial could not be loaded.' })
      else setF({ ...EMPTY, ...data, customer_role: data.customer_role ?? '', rating: data.rating ?? '' })
      setLoading(false)
    })
  }, [id, isNew])

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  async function save(e) {
    e.preventDefault()
    const errs = validateTestimonial(f)
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true); setMsg(null)
    const row = {
      customer_name: f.customer_name.trim(), customer_role: f.customer_role.trim() || null,
      message: f.message.trim(), rating: f.rating === '' ? null : Number(f.rating), is_published: f.is_published,
    }
    let error
    if (isNew) {
      const { data: last } = await supabase.from('testimonials').select('sort_order').order('sort_order', { ascending: false }).limit(1)
      ;({ error } = await supabase.from('testimonials').insert({ ...row, sort_order: (last?.[0]?.sort_order ?? 0) + 1 }))
    } else ({ error } = await supabase.from('testimonials').update(row).eq('id', id))
    setBusy(false)
    if (error) return setMsg({ ok: false, text: 'Could not save the testimonial. Please try again.' })
    nav('/admin/testimonials')
  }

  async function remove() {
    if (!window.confirm('Delete this testimonial for good? If you only want to stop showing it, use Hide instead.')) return
    setBusy(true)
    const { error } = await supabase.from('testimonials').delete().eq('id', id)
    setBusy(false)
    if (error) return setMsg({ ok: false, text: 'Could not delete the testimonial.' })
    nav('/admin/testimonials')
  }

  if (loading) return <p role="status">Loading testimonial…</p>
  return (
    <>
      <p><Link to="/admin/testimonials">← All testimonials</Link></p>
      <h1>{isNew ? 'Add a testimonial' : 'Edit testimonial'}</h1>
      {msg && <p className={msg.ok ? 'a-notice' : 'a-error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
      <form className="a-card" onSubmit={save} noValidate>
        <Field id="tname" label="Client name" error={errors.customer_name} hint="Use the name the client agreed to show, or “Client”."><input id="tname" value={f.customer_name} maxLength="80" onChange={set('customer_name')} /></Field>
        <Field id="trole" label="Role or company (optional)" error={errors.customer_role}><input id="trole" value={f.customer_role} maxLength="80" onChange={set('customer_role')} /></Field>
        <Field id="tmsg" label="What the client said" error={errors.message}><textarea id="tmsg" rows="5" maxLength="600" value={f.message} onChange={set('message')} /></Field>
        <Field id="trate" label="Star rating (optional)" error={errors.rating}>
          <select id="trate" value={f.rating} onChange={set('rating')}>
            <option value="">No rating</option>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
          </select>
        </Field>
        <label className="a-check"><input type="checkbox" checked={f.is_published} onChange={set('is_published')} /> Show on the website</label>
        <div className="a-actions">
          <button className="a-btn" disabled={busy}>{busy ? 'Saving…' : 'Save testimonial'}</button>
          {!isNew && <button type="button" className="a-btn a-btn-ghost" disabled={busy} onClick={remove}>Delete testimonial</button>}
        </div>
      </form>
    </>
  )
}
