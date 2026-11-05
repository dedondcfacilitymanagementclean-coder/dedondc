// Combines the built-in company content with what is saved in the database.
// Empty values and leftover "[Starter text...]" / "[Template...]" placeholders in the
// database are ignored, so real content can never be replaced by blanks or placeholders.
const PLACEHOLDER = /^\s*\[(starter|template|replace)/i
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

function usable(v) {
  if (v === null || v === undefined) return false
  if (typeof v === 'string') return v.trim() !== '' && !PLACEHOLDER.test(v)
  if (Array.isArray(v)) return v.length > 0
  return true
}

export function mergeSettings(defaults = {}, db = {}) {
  const out = { ...defaults }
  for (const [k, v] of Object.entries(db ?? {})) {
    if (!usable(v)) continue
    out[k] = isObj(v) && isObj(defaults[k]) ? mergeSettings(defaults[k], v) : v
  }
  return out
}
