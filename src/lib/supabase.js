import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && key)
// Only the public anon key is used here. The service-role key must never be in browser code.
export const supabase = isConfigured ? createClient(url, key) : null
