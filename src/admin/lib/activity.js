import { supabase } from '../../lib/supabase'

// Records an administrative action. Never put passwords, tokens or customer details in `details`.
// Failure to log must never block the action itself, so errors are swallowed on purpose.
export async function logActivity(userId, action, entity, entityId = null, details = {}) {
  if (!supabase || !userId) return
  try {
    await supabase.from('activity_logs').insert({
      actor_id: userId, action, entity, entity_id: entityId, details,
    })
  } catch { /* ignore */ }
}
