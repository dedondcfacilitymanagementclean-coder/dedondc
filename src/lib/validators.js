export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const NG_PHONE_RE = /^(?:\+?234|0)[789][01]\d{8}$/

export function isValidEmail(v) {
  const s = String(v ?? '').trim()
  return s.length <= 254 && EMAIL_RE.test(s)
}

export function normalizePhone(v) {
  return String(v ?? '').replace(/[\s()-]/g, '')
}

export function isValidNigerianPhone(v) {
  return NG_PHONE_RE.test(normalizePhone(v))
}

export function validateContact(f) {
  const e = {}
  if (String(f.name ?? '').trim().length < 2) e.name = 'Enter your full name.'
  if (!isValidEmail(f.email)) e.email = 'Enter a valid email address, like name@example.com.'
  if (f.phone && !isValidNigerianPhone(f.phone)) e.phone = 'Enter a Nigerian number, like 0813 065 3226 or +234 813 065 3226.'
  if (String(f.subject ?? '').trim().length < 2) e.subject = 'Enter a subject.'
  const m = String(f.message ?? '').trim().length
  if (m < 5) e.message = 'Write a message of at least 5 characters.'
  else if (m > 4000) e.message = 'Keep your message under 4000 characters.'
  return e
}

export const formatNaira = (n) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(Number(n) || 0)

// ---------- Quote / booking / file validation ----------
export const PROPERTY_TYPES = ['Home / apartment', 'Office', 'Shop / retail', 'Hotel / serviced apartment',
  'School', 'Healthcare facility', 'Restaurant / kitchen', 'Construction site', 'Industrial / warehouse', 'Other']
export const CONTACT_METHODS = [['phone', 'Phone call'], ['whatsapp', 'WhatsApp'], ['email', 'Email']]
export const TIME_RANGES = ['Morning (8am – 12pm)', 'Afternoon (12pm – 4pm)', 'Evening (4pm – 7pm)', 'Flexible / any time']
export const MAX_FILES = 5
export const MAX_FILE_BYTES = 5 * 1024 * 1024
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export function todayISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function validateFiles(files) {
  if (files.length > MAX_FILES) return `Attach no more than ${MAX_FILES} files.`
  for (const f of files) {
    if (!ALLOWED_TYPES.includes(f.type)) return `"${f.name}" is not allowed. Use JPG, PNG, WebP or PDF.`
    if (f.size > MAX_FILE_BYTES) return `"${f.name}" is larger than 5 MB.`
  }
  return ''
}

function commonChecks(f, e) {
  if (String(f.full_name ?? '').trim().length < 2) e.full_name = 'Enter your full name.'
  if (!isValidEmail(f.email)) e.email = 'Enter a valid email address, like name@example.com.'
  if (!isValidNigerianPhone(f.phone)) e.phone = 'Enter a Nigerian number, like 0813 065 3226 or +234 813 065 3226.'
  if (!f.service_id) e.service_id = 'Choose the service you need.'
  if (!f.property_type) e.property_type = 'Choose the property type.'
  const d = String(f.description ?? '').trim().length
  if (d < 10) e.description = 'Describe the job in at least 10 characters.'
  else if (d > 4000) e.description = 'Keep the description under 4000 characters.'
  if (!f.consent) e.consent = 'Please agree to the privacy policy to continue.'
}

export function validateQuote(f, today = todayISO()) {
  const e = {}
  commonChecks(f, e)
  if (!CONTACT_METHODS.some(([v]) => v === f.preferred_contact)) e.preferred_contact = 'Choose how we should contact you.'
  if (String(f.location ?? '').trim().length < 3) e.location = 'Enter the property location.'
  if (f.preferred_date && f.preferred_date < today) e.preferred_date = 'Choose today or a future date.'
  return e
}

export function validateBooking(f, today = todayISO()) {
  const e = {}
  commonChecks(f, e)
  if (String(f.address ?? '').trim().length < 3) e.address = 'Enter the service address.'
  if (!f.preferred_date) e.preferred_date = 'Choose your preferred date.'
  else if (f.preferred_date < today) e.preferred_date = 'Choose today or a future date.'
  if (!f.preferred_time) e.preferred_time = 'Choose a preferred time.'
  return e
}
