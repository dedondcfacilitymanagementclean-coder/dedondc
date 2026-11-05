import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export function useTestimonials(limit = 6) {
  const [state, setState] = useState({
    loading: Boolean(supabase),
    error: supabase ? null : 'not_configured',
    items: [],
  })
  useEffect(() => {
    if (!supabase) return
    supabase.from('testimonials')
      .select('id,customer_name,customer_role,message,rating')
      .eq('is_published', true)
      .order('sort_order').order('created_at', { ascending: false })
      .limit(limit)
      .then(({ data, error }) =>
        setState({ loading: false, error: error ? 'failed' : null, items: data ?? [] }))
  }, [limit])
  return state
}

export function initials(name) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

// Keeps a rating inside 0-5 so a bad value can never break the layout.
export function clampRating(n) {
  const v = Math.round(Number(n))
  return Number.isFinite(v) ? Math.min(5, Math.max(0, v)) : 0
}
