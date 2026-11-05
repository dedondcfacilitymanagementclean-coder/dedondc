import { Link } from 'react-router-dom'
import { useServices } from '../lib/useServices'
import { MAX_FILES } from '../lib/validators'

export function ServiceSelect({ value, onChange, slug, error }) {
  const { loading, services } = useServices()
  const current = value || services.find((s) => s.slug === slug)?.id || ''
  return (
    <select id="service_id" value={current} onChange={onChange} disabled={loading}
            aria-invalid={!!error} aria-describedby={error ? 'service_id-err' : undefined}>
      <option value="">{loading ? 'Loading services…' : 'Choose a service'}</option>
      {services.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
    </select>
  )
}

export function FileInput({ files, onChange, error }) {
  return (
    <>
      <input id="files" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf"
             onChange={(e) => onChange(Array.from(e.target.files))}
             aria-describedby={'files-hint' + (error ? ' files-err' : '')} />
      {files.length > 0 && (
        <ul className="filelist">{files.map((f) => <li key={f.name + f.size}>{f.name} ({Math.ceil(f.size / 1024)} KB)</li>)}</ul>
      )}
      {error && <p className="err" id="files-err" role="alert">{error}</p>}
      <p className="hint" id="files-hint">Up to {MAX_FILES} files, 5 MB each. JPG, PNG, WebP or PDF.</p>
    </>
  )
}

export function Consent({ checked, onChange, error }) {
  return (
    <div className="field">
      <label className="check">
        <input type="checkbox" checked={checked} onChange={onChange}
               aria-invalid={!!error} aria-describedby={error ? 'consent-err' : undefined} />
        <span>I have read and agree to the <Link to="/privacy-policy" target="_blank">Privacy Policy</Link>.</span>
      </label>
      {error && <p className="err" id="consent-err" role="alert">{error}</p>}
    </div>
  )
}

export function Honeypot({ value, onChange }) {
  return (
    <div className="hp" aria-hidden="true">
      <label>Website<input tabIndex="-1" autoComplete="off" value={value} onChange={onChange} /></label>
    </div>
  )
}

// A short support code that helps us find the real cause without showing technical detail.
export function errorCode(error) {
  if (!error) return ''
  if (error instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(error.message || '')) return 'NETWORK'
  return String(error.code || error.statusCode || error.status || error.name || 'UNKNOWN').slice(0, 20)
}

export function friendlyError(error) {
  const m = error?.message || ''
  if (/Too many|valid service|past|maximum/i.test(m)) return m
  if (m === 'upload_failed') return 'One of your files could not be uploaded. Remove it or try a smaller file.'
  console.error('Form submission failed:', error)
  return `We could not send your request. Please try again, or call us. (Support code: ${errorCode(error)})`
}
