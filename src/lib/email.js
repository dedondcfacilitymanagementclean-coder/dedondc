import { supabase } from './supabase'

// Asks the server to send the confirmation emails for a form that was just submitted.
// This must never get in the way of the customer: it runs in the background and every
// failure is swallowed (the request itself is already safely saved in the database).
export function notifySubmission(type, value) {
  if (!supabase || !value || value === '—') return
  const body = type === 'contact_received' ? { type, id: value } : { type, reference: value }
  try {
    supabase.functions.invoke('send-email', { body }).catch(() => {})
  } catch { /* ignore */ }
}

// Admin dashboard: sends an email through the same function. Returns { ok, message, marked? }.
export async function adminEmail(body) {
  if (!supabase) return { ok: false, message: 'The database is not connected.' }
  const { data, error } = await supabase.functions.invoke('send-email', { body })
  if (data && typeof data === 'object' && 'ok' in data) return data
  // Non-2xx answers arrive as an error whose context holds the response; read our message from it.
  try {
    const parsed = await error?.context?.json?.()
    if (parsed?.message) return { ok: false, ...parsed }
  } catch { /* fall through */ }
  return { ok: false, message: 'The email service could not be reached. Please try again.' }
}
