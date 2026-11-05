import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { supabase } from '../../lib/supabase'
import { passwordProblem } from '../lib/password'
import { useTitle } from '../useAdminHead'

export default function Reset() {
  useTitle('Set a new password')
  const auth = useAuth()
  const [waited, setWaited] = useState(false)
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)

  useEffect(() => { const t = setTimeout(() => setWaited(true), 1500); return () => clearTimeout(t) }, [])

  async function submit(e) {
    e.preventDefault()
    if (lock.current) return
    const problem = passwordProblem(pw, confirm)
    if (problem) { setError(problem); return }
    lock.current = true; setBusy(true); setError('')
    const { error: err } = await supabase.auth.updateUser({ password: pw })
    lock.current = false; setBusy(false)
    if (err) setError('Could not change the password. The link may have expired. Request a new one.')
    else setDone(true)
  }

  if (!auth.session && (auth.status === 'loading' || !waited)) {
    return <main className="a-center"><p role="status">Checking your reset link…</p></main>
  }
  if (!auth.session) {
    return (
      <main className="a-center"><div className="a-card a-narrow">
        <h1>Link expired</h1>
        <p>This reset link is invalid or has expired.</p>
        <Link className="a-btn" to="/admin/login">Request a new link</Link>
      </div></main>
    )
  }
  return (
    <main className="a-center"><div className="a-card a-narrow">
      <h1>Set a new password</h1>
      {done ? (
        <><p className="a-ok" role="status">Your password has been changed.</p><Link className="a-btn" to="/admin">Go to the dashboard</Link></>
      ) : (
        <form onSubmit={submit} noValidate aria-busy={busy}>
          {error && <p className="a-error" role="alert">{error}</p>}
          <label htmlFor="r-pw">New password</label>
          <input id="r-pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <label htmlFor="r-pw2">Confirm new password</label>
          <input id="r-pw2" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <button className="a-btn" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
        </form>
      )}
    </div></main>
  )
}
