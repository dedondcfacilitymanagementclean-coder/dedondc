import { useRef, useState } from 'react'
import { useAuth } from '../AuthContext'
import { supabase } from '../../lib/supabase'
import { logActivity } from '../lib/activity'
import { passwordProblem } from '../lib/password'
import { describeLoginError } from '../lib/authErrors'
import { useTitle } from '../useAdminHead'

export default function Settings() {
  useTitle('Settings')
  const { user, fullName, setFullName, signOut } = useAuth()
  const [name, setName] = useState(fullName)
  const [nameMsg, setNameMsg] = useState(null)
  const [cur, setCur] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwMsg, setPwMsg] = useState(null)
  const [busy, setBusy] = useState('')
  const lock = useRef(false)

  async function saveName(e) {
    e.preventDefault()
    if (lock.current) return
    const clean = name.trim().slice(0, 80)
    lock.current = true; setBusy('name'); setNameMsg(null)
    const { error } = await supabase.from('profiles').update({ full_name: clean || null }).eq('id', user.id)
    lock.current = false; setBusy('')
    if (error) { setNameMsg({ ok: false, text: 'Could not save your name. Please try again.' }); return }
    setFullName(clean); setName(clean)
    setNameMsg({ ok: true, text: 'Name saved.' })
    logActivity(user.id, 'profile_updated', 'profile', user.id)
  }

  async function changePassword(e) {
    e.preventDefault()
    if (lock.current) return
    if (!cur) { setPwMsg({ ok: false, text: 'Enter your current password.' }); return }
    const problem = passwordProblem(pw, pw2)
    if (problem) { setPwMsg({ ok: false, text: problem }); return }
    lock.current = true; setBusy('pw'); setPwMsg(null)
    // Re-check the current password first, so a borrowed open session cannot change it.
    const check = await supabase.auth.signInWithPassword({ email: user.email, password: cur })
    if (check.error) {
      lock.current = false; setBusy('')
      setPwMsg({ ok: false, text: check.error.status === 429 ? describeLoginError(check.error) : 'Your current password is incorrect.' })
      return
    }
    const { error } = await supabase.auth.updateUser({ password: pw })
    lock.current = false; setBusy('')
    if (error) { setPwMsg({ ok: false, text: 'Could not change the password. Please try again.' }); return }
    setCur(''); setPw(''); setPw2('')
    setPwMsg({ ok: true, text: 'Password changed.' })
    logActivity(user.id, 'password_changed', 'account', user.id)
  }

  return (
    <>
      <h1>Settings</h1>
      <section className="a-card" aria-labelledby="s-prof">
        <h2 id="s-prof">Your profile</h2>
        <p className="a-muted">Signed in as <strong>{user?.email}</strong></p>
        <form onSubmit={saveName} noValidate aria-busy={busy === 'name'}>
          {nameMsg && <p className={nameMsg.ok ? 'a-ok' : 'a-error'} role={nameMsg.ok ? 'status' : 'alert'}>{nameMsg.text}</p>}
          <label htmlFor="s-name">Display name</label>
          <input id="s-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
          <button className="a-btn" disabled={busy === 'name'}>{busy === 'name' ? 'Saving…' : 'Save name'}</button>
        </form>
      </section>

      <section className="a-card" aria-labelledby="s-pw">
        <h2 id="s-pw">Change password</h2>
        <form onSubmit={changePassword} noValidate aria-busy={busy === 'pw'}>
          {pwMsg && <p className={pwMsg.ok ? 'a-ok' : 'a-error'} role={pwMsg.ok ? 'status' : 'alert'}>{pwMsg.text}</p>}
          <label htmlFor="s-cur">Current password</label>
          <input id="s-cur" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />
          <label htmlFor="s-new">New password</label>
          <input id="s-new" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <label htmlFor="s-new2">Confirm new password</label>
          <input id="s-new2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          <p className="a-muted">At least 10 characters, with a letter and a number.</p>
          <button className="a-btn" disabled={busy === 'pw'}>{busy === 'pw' ? 'Saving…' : 'Change password'}</button>
        </form>
      </section>

      <section className="a-card">
        <h2>Sign out</h2>
        <button className="a-btn a-btn-ghost" onClick={() => signOut()}>Sign out of this device</button>
      </section>
    </>
  )
}
