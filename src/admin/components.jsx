import { useEffect, useState } from 'react'
import { QUOTE_STATUS, statusLabel } from './lib/status'
import { serviceImageUrl } from '../lib/useServices'
import { validateImageFile } from './lib/image'

export function StatusBadge({ status, map = QUOTE_STATUS }) {
  return <span className={'a-status s-' + status}>{statusLabel(map, status)}</span>
}

export function Field({ id, label, error, hint, children }) {
  return (
    <div className="a-field">
      <label htmlFor={id}>{label}</label>
      {hint && <p className="a-muted a-hint" id={id + '-hint'}>{hint}</p>}
      {children}
      {error && <p className="a-error" id={id + '-err'} role="alert">{error}</p>}
    </div>
  )
}

// Database messages raised by our own rules are written to be readable; anything else stays generic.
export function friendlyDbError(error, fallback = 'Something went wrong. Please try again.') {
  return error?.code === 'P0001' && error.message ? error.message : fallback
}


// Picture chooser with a live preview. `current` is a stored path (shown until a new file is chosen).
export function ImageField({ id, label, current, file, onFile, error, onRemove }) {
  const [preview, setPreview] = useState('')
  useEffect(() => {
    if (!file) { setPreview(''); return undefined }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  const shown = preview || serviceImageUrl(current)
  return (
    <Field id={id} label={label} error={error} hint="JPG, PNG or WebP. Large pictures are shrunk automatically.">
      {shown && <img className="a-preview" src={shown} alt="" />}
      <input id={id} type="file" accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          const f = e.target.files?.[0]
          const problem = f ? validateImageFile(f) : ''
          if (problem) { onFile(null, problem); e.target.value = '' } else onFile(f ?? null, '')
        }} />
      {onRemove && (current || file) && <button type="button" className="a-btn a-btn-ghost" onClick={onRemove}>Remove picture</button>}
    </Field>
  )
}

export function MoveButtons({ onUp, onDown, disabled, first, last }) {
  return (
    <span className="a-move">
      <button type="button" className="a-btn a-btn-ghost" aria-label="Move up" disabled={disabled || first} onClick={onUp}>↑</button>
      <button type="button" className="a-btn a-btn-ghost" aria-label="Move down" disabled={disabled || last} onClick={onDown}>↓</button>
    </span>
  )
}

export function PublishBadge({ published }) {
  return <span className={'a-status ' + (published ? 's-confirmed' : 's-closed')}>{published ? 'Published' : 'Hidden'}</span>
}

// For the administrator only: shows what the database actually said, so problems can be fixed fast.
export function describeError(error) {
  if (!error) return ''
  const code = error.code || error.status || ''
  const text = String(error.message || '').slice(0, 200)
  return [code && `Code ${code}`, text].filter(Boolean).join(': ')
}
