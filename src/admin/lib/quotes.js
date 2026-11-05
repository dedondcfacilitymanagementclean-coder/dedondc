import { todayISO } from '../../lib/validators'

export const PAGE_SIZE = 15
export const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR']

// Mirrors the rules in the database (migration 010). The database always has the final say.
export const QUOTE_TRANSITIONS = {
  new: ['under_review', 'quotation_prepared', 'declined', 'closed'],
  under_review: ['quotation_prepared', 'declined', 'closed'],
  quotation_prepared: ['quotation_sent', 'under_review', 'declined', 'closed'],
  quotation_sent: ['accepted', 'declined', 'closed', 'quotation_prepared'],
  accepted: ['closed'],
  declined: ['under_review', 'closed'],
  closed: ['under_review'],
}
export const nextStatuses = (s) => QUOTE_TRANSITIONS[s] ?? []

// "Quotation prepared" and "Quotation sent" are set automatically when a quotation is created or
// sent, so they are not offered in the manual status list.
export const manualStatuses = (s) => nextStatuses(s).filter((x) => x !== 'quotation_prepared' && x !== 'quotation_sent')

// Strips characters that have a special meaning in a database filter, so typed text can never
// change the shape of the search.
export const safeSearch = (text) => String(text ?? '').replace(/[,()%*\\:"'_]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)

export function parseAmount(text) {
  const t = String(text ?? '').replace(/[\s,₦]/g, '')
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(t)) return NaN
  return Number(t)
}

export function validateQuotation(f, today = todayISO()) {
  const e = {}
  const amount = parseAmount(f.amount)
  if (Number.isNaN(amount)) e.amount = 'Enter the amount as a number, like 150000 or 150,000.50.'
  else if (amount <= 0) e.amount = 'The amount must be greater than zero.'
  if (!CURRENCIES.includes(f.currency)) e.currency = 'Choose a currency.'
  const d = String(f.description ?? '').trim().length
  if (d < 10) e.description = 'Describe the quoted work in at least 10 characters.'
  else if (d > 2000) e.description = 'Keep the description under 2000 characters.'
  if (f.expires_on && f.expires_on < today) e.expires_on = 'The expiry date cannot be in the past.'
  return e
}

// "0813 065 3226" or "+234 813 065 3226" -> "2348130653226" (empty if it is not a Nigerian number)
export function waNumber(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '')
  if (/^234[789][01]\d{8}$/.test(digits)) return digits
  if (/^0[789][01]\d{8}$/.test(digits)) return '234' + digits.slice(1)
  return ''
}

export function whatsappUrl(phone, text) {
  const n = waNumber(phone)
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : ''
}
