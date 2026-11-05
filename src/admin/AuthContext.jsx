import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

const EMPTY = { session: null, role: null, fullName: '' }

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: supabase ? 'loading' : 'unconfigured', ...EMPTY })

  useEffect(() => {
    if (!supabase) return undefined
    let active = true

    // The role always comes from the database (profiles.role), never from the browser.
    async function load(session) {
      if (!session) { if (active) setState({ status: 'ready', ...EMPTY }); return }
      const { data, error } = await supabase.from('profiles')
        .select('role,full_name').eq('id', session.user.id).maybeSingle()
      if (active) setState({ status: 'ready', session, role: error ? null : (data?.role ?? null), fullName: data?.full_name ?? '' })
    }

    supabase.auth.getSession().then(({ data }) => load(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => load(session), 0) // never call Supabase directly inside this callback
    })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [])

  const signIn = useCallback((email, password) =>
    supabase.auth.signInWithPassword({ email: email.trim(), password }), [])
  const signOut = useCallback(() => supabase.auth.signOut(), [])
  const setFullName = useCallback((fullName) => setState((s) => ({ ...s, fullName })), [])

  const value = useMemo(() => ({
    ...state, user: state.session?.user ?? null, isAdmin: state.role === 'admin', signIn, signOut, setFullName,
  }), [state, signIn, signOut, setFullName])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
