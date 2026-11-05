// "2026-03-15" -> "March 2026". Parsed by hand so time zones can never shift the date.
export function formatMonthYear(iso) {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(iso ?? '')
  if (!m) return ''
  return new Date(Date.UTC(+m[1], +m[2] - 1, 1)).toLocaleDateString('en-NG', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

// Short preview of a long text, cut at a word boundary.
export function excerpt(text, max = 120) {
  const t = String(text ?? '').trim()
  if (t.length <= max) return t
  return t.slice(0, max).replace(/\s+\S*$/, '') + '…'
}

// "2026-10-30T00:22:00Z" -> "30 Oct 2026, 1:22 am" in Nigerian time.
export function formatDateTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' }).format(d)
}

// 150000.5, "NGN" -> "₦150,000.50"
export function formatMoney(amount, currency = 'NGN') {
  try {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(Number(amount) || 0)
  } catch {
    return `${currency} ${Number(amount) || 0}`
  }
}

// "2026-10-30" -> "30 Oct 2026" (parsed by hand so time zones can never shift the day)
export function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  if (!m) return ''
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}
