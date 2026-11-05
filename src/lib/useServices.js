import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export function useServices() {
  const [state, setState] = useState({
    loading: Boolean(supabase),
    error: supabase ? null : 'not_configured',
    services: [],
  })
  useEffect(() => {
    if (!supabase) return
    supabase.from('services').select('*').eq('is_published', true).order('sort_order')
      .then(({ data, error }) =>
        setState({ loading: false, error: error ? 'failed' : null, services: data ?? [] }))
  }, [])
  return state
}

export function serviceImageUrl(path) {
  if (!path) return null
  if (path.startsWith('/')) return path          // image bundled with the website
  if (!supabase) return null
  return supabase.storage.from('public-media').getPublicUrl(path).data.publicUrl
}
