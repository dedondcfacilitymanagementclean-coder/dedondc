import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export function useProjects(limit) {
  const [state, setState] = useState({
    loading: Boolean(supabase),
    error: supabase ? null : 'not_configured',
    projects: [],
  })
  useEffect(() => {
    if (!supabase) return
    let q = supabase.from('projects')
      .select('id,title,description,image_path,location,completed_on,services(title,slug)')
      .eq('is_published', true)
      .order('sort_order').order('created_at', { ascending: false })
    if (limit) q = q.limit(limit)
    q.then(({ data, error }) =>
      setState({ loading: false, error: error ? 'failed' : null, projects: data ?? [] }))
  }, [limit])
  return state
}
