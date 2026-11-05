// Validation and helpers for the content pages (services, projects, testimonials, website text).

export const slugify = (text) =>
  String(text ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)

const len = (v) => String(v ?? '').trim().length

// "one benefit per line" text <-> list
export const linesToList = (text) => String(text ?? '').split('\n').map((l) => l.trim()).filter(Boolean)
export const listToLines = (list) => (Array.isArray(list) ? list.join('\n') : '')

export function validateService(f) {
  const e = {}
  if (len(f.title) < 2 || len(f.title) > 120) e.title = 'Enter a title between 2 and 120 characters.'
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.slug ?? '') || f.slug.length > 60) e.slug = 'Use only lowercase letters, numbers and single hyphens, like "office-cleaning".'
  if (len(f.short_description) > 160) e.short_description = 'Keep the short summary under 160 characters.'
  if (len(f.description) > 6000) e.description = 'Keep the description under 6000 characters.'
  const b = linesToList(f.benefits)
  if (b.length > 12) e.benefits = 'Use at most 12 benefits.'
  else if (b.some((x) => x.length > 120)) e.benefits = 'Each benefit must be under 120 characters.'
  if (len(f.icon) > 8) e.icon = 'Use a short icon, like one emoji.'
  return e
}

export function validateProject(f, hasImage) {
  const e = {}
  if (len(f.title) < 2 || len(f.title) > 160) e.title = 'Enter a title between 2 and 160 characters.'
  if (len(f.description) > 2000) e.description = 'Keep the description under 2000 characters.'
  if (len(f.location) > 120) e.location = 'Keep the location under 120 characters.'
  if (f.completed_on && !/^\d{4}-\d{2}-\d{2}$/.test(f.completed_on)) e.completed_on = 'Choose a valid date.'
  if (!hasImage) e.image = 'Add a photo of the job.'
  return e
}

export function validateTestimonial(f) {
  const e = {}
  if (len(f.customer_name) < 2 || len(f.customer_name) > 80) e.customer_name = 'Enter the client name (2 to 80 characters).'
  if (len(f.customer_role) > 80) e.customer_role = 'Keep the role under 80 characters.'
  if (len(f.message) < 10 || len(f.message) > 600) e.message = 'The message must be 10 to 600 characters.'
  if (f.rating !== '' && f.rating != null && !(Number.isInteger(Number(f.rating)) && f.rating >= 1 && f.rating <= 5)) e.rating = 'Choose a rating from 1 to 5, or leave it empty.'
  return e
}

const PHONE = /^\+?[0-9][0-9\s()-]{6,19}$/
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function validateCompany(c) {
  const e = {}
  if (len(c.name) < 2) e.name = 'Enter the company name.'
  if (!PHONE.test(String(c.phone_primary ?? '').trim())) e.phone_primary = 'Enter a valid phone number.'
  if (c.phone_secondary && !PHONE.test(String(c.phone_secondary).trim())) e.phone_secondary = 'Enter a valid phone number or leave it empty.'
  if (c.whatsapp && !/^\d{10,15}$/.test(String(c.whatsapp).trim())) e.whatsapp = 'Digits only with country code, like 2348130653226.'
  if (!EMAIL.test(String(c.email ?? '').trim())) e.email = 'Enter a valid email address.'
  if (c.map_embed_url && !/^https:\/\/www\.google\.com\/maps\/embed\?/.test(c.map_embed_url.trim())) e.map_embed_url = 'Paste only the link from Google Maps > Share > Embed a map (it starts with https://www.google.com/maps/embed?).'
  if (len(c.branch_address) > 300) e.branch_address = 'Keep the branch address under 300 characters.'
  if (Array.isArray(c.service_areas) && (c.service_areas.length > 20 || c.service_areas.some((a) => a.length > 60))) e.service_areas_text = 'Use at most 20 areas, each under 60 characters.'
  if (len(c.address) > 300) e.address = 'Keep the address under 300 characters.'
  if (len(c.opening_hours) > 500) e.opening_hours = 'Keep the opening hours under 500 characters.'
  return e
}

export const PLACEHOLDER_NOTE = /\[[^\]]*(business|template|starter|replace)[^\]]*\]/i

export function validateLegal(body) {
  const e = {}
  const t = String(body ?? '').trim()
  if (t.length < 100) e.body = 'The text looks too short. Write the full document.'
  else if (t.length > 40000) e.body = 'The text is too long.'
  else if (PLACEHOLDER_NOTE.test(t)) e.body = 'Remove or complete the bracketed notes like “[Business to confirm …]” before saving.'
  return e
}

export function validateTextBlock(v, label, min = 10, max = 4000) {
  const n = len(v)
  if (n < min) return `${label} is too short.`
  if (n > max) return `${label} is too long (maximum ${max} characters).`
  return ''
}

// Legal text is stored as plain paragraphs; a line starting with "## " becomes a heading.
export function templateToText(sections) {
  return sections.map(([h, t]) => `## ${h}\n\n${t}`).join('\n\n')
}
