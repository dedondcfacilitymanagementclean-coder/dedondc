// Rules for the administrator's password. Supabase also enforces its own minimum length,
// so set "Minimum password length" to 10 or more in Supabase > Authentication > Sign In / Providers.
export const MIN_PASSWORD = 10

export function passwordProblem(password, confirm) {
  const p = String(password ?? '')
  if (p.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'Include at least one letter and one number.'
  if (confirm !== undefined && p !== confirm) return 'The two passwords do not match.'
  return ''
}
