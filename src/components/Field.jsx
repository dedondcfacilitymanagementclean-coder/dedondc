export default function Field({ id, label, error, hint, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint && <p className="hint" id={id + '-hint'}>{hint}</p>}
      {children}
      {error && <p className="err" id={id + '-err'} role="alert">{error}</p>}
    </div>
  )
}
