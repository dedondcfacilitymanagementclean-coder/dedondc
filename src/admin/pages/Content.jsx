import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { DEFAULTS } from '../../lib/settings'
import { mergeSettings } from '../../lib/mergeSettings'
import { LEGAL_TEMPLATES } from '../../pages/Legal'
import { Field } from '../components'
import { linesToList, listToLines, templateToText, validateCompany, validateLegal, validateTextBlock } from '../lib/content'
import { useTitle } from '../useAdminHead'

const TABS = [['company', 'Company and contact'], ['home', 'Home page'], ['about', 'About page'], ['legal_privacy', 'Privacy policy'], ['legal_terms', 'Terms of service']]

function ItemsEditor({ id, label, items, onChange, error }) {
  const list = items ?? []
  const upd = (i, k, v) => onChange(list.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
  const move = (i, d) => { const n = [...list]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; onChange(n) }
  return (
    <fieldset className="a-fieldset">
      <legend>{label}</legend>
      {list.map((it, i) => (
        <div className="a-item" key={i}>
          <Field id={`${id}-t${i}`} label={`Heading ${i + 1}`}><input id={`${id}-t${i}`} value={it.title ?? ''} maxLength="80" onChange={(e) => upd(i, 'title', e.target.value)} /></Field>
          <Field id={`${id}-x${i}`} label="Text"><textarea id={`${id}-x${i}`} rows="3" maxLength="600" value={it.text ?? ''} onChange={(e) => upd(i, 'text', e.target.value)} /></Field>
          <div className="a-actions">
            <button type="button" className="a-btn a-btn-ghost" aria-label={`Move ${it.title || 'item'} up`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
            <button type="button" className="a-btn a-btn-ghost" aria-label={`Move ${it.title || 'item'} down`} disabled={i === list.length - 1} onClick={() => move(i, 1)}>↓</button>
            <button type="button" className="a-btn a-btn-ghost" onClick={() => onChange(list.filter((_, j) => j !== i))}>Remove</button>
          </div>
        </div>
      ))}
      {list.length < 12 && <button type="button" className="a-btn a-btn-ghost" onClick={() => onChange([...list, { title: '', text: '' }])}>Add another</button>}
      {error && <p className="a-error" role="alert">{error}</p>}
    </fieldset>
  )
}

function checkItems(items, label) {
  for (const it of items ?? []) {
    if (String(it.title ?? '').trim().length < 2 || String(it.text ?? '').trim().length < 10) return `Every ${label} needs a heading (2+ characters) and text (10+ characters).`
  }
  return ''
}

function validate(tab, v) {
  const e = {}
  if (tab === 'company') return validateCompany({ ...v, service_areas: linesToList(v.service_areas_text) })
  if (tab === 'home') {
    ;[['hero_title', 'The headline', 5, 160], ['hero_text', 'The opening text', 10, 600], ['intro', 'The introduction', 20, 3000]].forEach(([k, l, mn, mx]) => { const m = validateTextBlock(v[k], l, mn, mx); if (m) e[k] = m })
    const w = checkItems(v.why, 'item'); if (w) e.why = w
  }
  if (tab === 'about') {
    ;[['background', 'The background', 20, 4000], ['mission', 'The mission', 10, 1500], ['vision', 'The vision', 10, 1500], ['commitment', 'The commitment', 10, 1500]].forEach(([k, l, mn, mx]) => { const m = validateTextBlock(v[k], l, mn, mx); if (m) e[k] = m })
    const w = checkItems(v.values, 'value'); if (w) e.values = w
  }
  return e
}

export default function Content() {
  useTitle('Website content')
  const [tab, setTab] = useState('company')
  const [data, setData] = useState(null)       // merged settings by key
  const [draft, setDraft] = useState(null)
  const [errors, setErrors] = useState({})
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    supabase.from('site_settings').select('key,value').in('key', TABS.map((t) => t[0])).then(({ data: rows, error }) => {
      if (error) return setFailed(true)
      const out = {}
      TABS.forEach(([k]) => { out[k] = mergeSettings(DEFAULTS[k] ?? {}, rows.find((r) => r.key === k)?.value ?? {}) })
      setData(out)
    })
  }, [])

  const startDraft = (key, d) => {
    if (key.startsWith('legal_')) {
      const body = d[key]?.body
      return { body: body && !body.startsWith('[Template') ? body : templateToText(LEGAL_TEMPLATES[key]) }
    }
    if (key === 'company') return { ...d[key], service_areas_text: listToLines(d[key].service_areas) }
    return { ...d[key] }
  }
  const ready = Boolean(data)
  // Reset the form when the section changes (not after every save, so the "Saved" message stays visible).
  useEffect(() => { if (data) { setDraft(startDraft(tab, data)); setErrors({}); setMsg(null) } }, [tab, ready])

  if (failed) return <p className="a-error" role="alert">Could not load the website content. Refresh the page to try again.</p>
  if (!data || !draft) return <p role="status">Loading website content…</p>

  const set = (k) => (e) => setDraft((p) => ({ ...p, [k]: e.target.value }))
  const isLegal = tab.startsWith('legal_')

  async function save(e) {
    e.preventDefault()
    const errs = isLegal ? validateLegal(draft.body) : validate(tab, draft)
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true); setMsg(null)
    const cleaned = Object.fromEntries(Object.entries(draft).filter(([k]) => k !== 'service_areas_text').map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]))
    if (tab === 'company') cleaned.service_areas = linesToList(draft.service_areas_text)
    const value = isLegal ? { body: draft.body.trim() } : cleaned
    const { error } = await supabase.from('site_settings').upsert({ key: tab, value, is_public: true }, { onConflict: 'key' })
    setBusy(false)
    if (error) return setMsg({ ok: false, text: 'Could not save. Please try again.' })
    setData((p) => ({ ...p, [tab]: value }))
    setMsg({ ok: true, text: 'Saved. The change is now live on the website.' })
  }

  async function resetLegal() {
    if (!window.confirm('Go back to the draft template? Your own text will be removed from the website.')) return
    setBusy(true)
    const { error } = await supabase.from('site_settings').upsert({ key: tab, value: { body: '' }, is_public: true }, { onConflict: 'key' })
    setBusy(false)
    if (error) return setMsg({ ok: false, text: 'Could not reset. Please try again.' })
    setData((p) => ({ ...p, [tab]: { body: '' } }))
    setMsg({ ok: true, text: 'The draft template is showing again.' })
  }

  const T = (k, label, opts = {}) => (
    <Field id={k} label={label} error={errors[k]} hint={opts.hint}>
      {opts.rows ? <textarea id={k} rows={opts.rows} value={draft[k] ?? ''} onChange={set(k)} /> : <input id={k} value={draft[k] ?? ''} onChange={set(k)} />}
    </Field>
  )

  return (
    <>
      <h1>Website content</h1>
      <div className="a-tabs" role="tablist" aria-label="Sections">
        {TABS.map(([k, label]) => <button key={k} role="tab" aria-selected={tab === k} className={'a-tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{label}</button>)}
      </div>
      {msg && <p className={msg.ok ? 'a-notice' : 'a-error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
      <form className="a-card" onSubmit={save} noValidate>
        {tab === 'company' && <>
          {T('name', 'Company name')}{T('rc_number', 'RC number')}{T('established', 'Established')}
          {T('slogan', 'Slogan')}{T('service_promise', 'Service promise')}
          {T('phone_primary', 'Main phone number')}{T('phone_secondary', 'Second phone number (optional)')}
          {T('whatsapp', 'WhatsApp number (digits only)', { hint: 'Example: 2348130653226' })}
          {T('email', 'Email address')}{T('location', 'Town and state')}
          {T('address', 'Head office address', { rows: 2 })}{T('branch_address', 'Branch office address (optional)', { rows: 2 })}
          {T('service_areas_text', 'Areas you serve (one per line)', { rows: 6 })}
          {T('opening_hours', 'Opening hours (optional)', { rows: 3 })}
          {T('map_embed_url', 'Google Maps embed link (optional)', { hint: 'In Google Maps: Share > Embed a map > copy only the link inside src="…"' })}
        </>}
        {tab === 'home' && <>
          {T('hero_title', 'Main headline')}{T('hero_text', 'Opening text', { rows: 3 })}{T('intro', 'Company introduction', { rows: 6 })}
          <ItemsEditor id="why" label="“Why choose us” points" items={draft.why} onChange={(v) => setDraft((p) => ({ ...p, why: v }))} error={errors.why} />
        </>}
        {tab === 'about' && <>
          {T('background', 'Company background', { rows: 6 })}{T('mission', 'Mission', { rows: 3 })}{T('vision', 'Vision', { rows: 3 })}{T('commitment', 'Our commitment', { rows: 3 })}
          <ItemsEditor id="values" label="Core values" items={draft.values} onChange={(v) => setDraft((p) => ({ ...p, values: v }))} error={errors.values} />
        </>}
        {isLegal && <>
          <p className="a-notice">This text is a starting draft. Have it reviewed by a lawyer before you rely on it. Saving removes the “Draft template” notice from the page. Write a heading as a line starting with “## ”, and separate paragraphs with a blank line.</p>
          <Field id="body" label={tab === 'legal_privacy' ? 'Privacy policy text' : 'Terms of service text'} error={errors.body}>
            <textarea id="body" rows="22" value={draft.body} onChange={set('body')} />
          </Field>
        </>}
        <div className="a-actions">
          <button className="a-btn" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
          {isLegal && <button type="button" className="a-btn a-btn-ghost" disabled={busy} onClick={resetLegal}>Use the draft template again</button>}
        </div>
      </form>
    </>
  )
}
