import { useRef, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { supabase } from '../../lib/supabase'
import { describeLoginError } from '../lib/authErrors'
import { useTitle } from '../useAdminHead'

export default function Login() {
  useTitle('Sign in')
  const auth = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState('login') // login | forgot
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const lock = useRef(false)
  const wanted = location.state?.from
  const from = typeof wanted === 'string' && wanted.startsWith('/admin') ? wanted : '/admin'

  if (auth.status === 'ready' && auth.role === 'admin') return <Navigate to={from} replace />

  async function login(e) {
    e.preventDefault()
    if (lock.current) return
    if (!email.trim() || !password) { setError('Enter your email and password.'); return }
    lock.current = true; setBusy(true); setError('')
    const { error: err } = await auth.signIn(email, password)
    lock.current = false; setBusy(false)
    if (err) setError(describeLoginError(err))
  }

  async function forgot(e) {
    e.preventDefault()
    if (lock.current) return
    if (!email.trim()) { setError('Enter your email address.'); return }
    lock.current = true; setBusy(true); setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/admin/reset`,
    })
    lock.current = false; setBusy(false)
    if (err && (err.status === 429 || /rate limit/i.test(err.message ?? ''))) setError(describeLoginError(err))
    else setSent(true) // same message whether or not the email has an account
  }

  if (auth.status === 'unconfigured') {
    return <main className="a-center"><p className="a-notice">The database is not connected. Add your Supabase keys to the .env file.</p></main>
  }
  const signedInNotAdmin = auth.status === 'ready' && auth.session && auth.role !== 'admin'

  return (
    <main className="a-center">
      <div className="a-card a-narrow">
        <img className="a-logo" src="/logo-96.webp" width="64" height="64" alt="DE DON DC logo" />
        <h1>{mode === 'login' ? 'Administrator sign in' : 'Reset your password'}</h1>

        {signedInNotAdmin && (
          <div role="alert" className="a-error">
            <p>You are signed in, but this account is not authorised to use the dashboard.</p>
            <button className="a-btn a-btn-ghost" onClick={() => auth.signOut()}>Sign out</button>
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={login} noValidate aria-busy={busy}>
            {error && <p className="a-error" role="alert">{error}</p>}
            <label htmlFor="a-email">Email address</label>
            <input id="a-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
            <label htmlFor="a-pass">Password</label>
            <input id="a-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="a-btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
            <p><button type="button" className="a-link" onClick={() => { setMode('forgot'); setError('') }}>Forgot your password?</button></p>
          </form>
        ) : sent ? (
          <div>
            <p className="a-ok" role="status">If an account exists for that email, a reset link has been sent. Check your inbox and spam folder.</p>
            <button type="button" className="a-link" onClick={() => { setMode('login'); setSent(false) }}>Back to sign in</button>
          </div>
        ) : (
          <form onSubmit={forgot} noValidate aria-busy={busy}>
            {error && <p className="a-error" role="alert">{error}</p>}
            <label htmlFor="a-email2">Email address</label>
            <input id="a-email2" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="a-btn" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
            <p><button type="button" className="a-link" onClick={() => { setMode('login'); setError('') }}>Back to sign in</button></p>
          </form>
        )}
      </div>
    </main>
  )
}
