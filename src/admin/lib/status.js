export const QUOTE_STATUS = {
  new: 'New', under_review: 'Under review', quotation_prepared: 'Quotation prepared',
  quotation_sent: 'Quotation sent', accepted: 'Accepted', declined: 'Declined', closed: 'Closed',
}
export const BOOKING_STATUS = {
  pending_review: 'Pending review', confirmed: 'Confirmed', reschedule_proposed: 'Reschedule proposed',
  completed: 'Completed', declined: 'Declined', cancelled: 'Cancelled',
}

export function humanize(text) {
  const t = String(text ?? '').replace(/_/g, ' ').trim()
  return t ? t[0].toUpperCase() + t.slice(1) : ''
}

export const statusLabel = (map, key) => map[key] ?? humanize(key)
