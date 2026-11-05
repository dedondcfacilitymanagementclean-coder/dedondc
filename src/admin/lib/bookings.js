import { todayISO, TIME_RANGES } from '../../lib/validators'

// Mirrors the rules in the database (migration 011). The database always has the final say.
export const BOOKING_TRANSITIONS = {
  pending_review: ['confirmed', 'reschedule_proposed', 'declined', 'cancelled'],
  reschedule_proposed: ['confirmed', 'declined', 'cancelled', 'pending_review'],
  confirmed: ['completed', 'reschedule_proposed', 'cancelled'],
  declined: ['pending_review'],
  completed: [],
  cancelled: [],
}
export const bookingNext = (s) => BOOKING_TRANSITIONS[s] ?? []

// Buttons shown for each status: [target status, button text, style, needs confirmation message]
export function bookingActions(status) {
  const all = {
    confirmed: status === 'reschedule_proposed'
      ? ['confirmed', 'Customer agreed: confirm new time', 'primary']
      : ['confirmed', 'Confirm booking', 'primary'],
    completed: ['completed', 'Mark as completed', 'primary'],
    declined: ['declined', 'Decline', 'ghost', 'Decline this booking?'],
    cancelled: ['cancelled', 'Cancel booking', 'ghost', 'Cancel this booking? This cannot be undone.'],
    pending_review: status === 'declined'
      ? ['pending_review', 'Reopen for review', 'ghost']
      : ['pending_review', 'Back to pending review', 'ghost'],
  }
  return bookingNext(status).filter((s) => all[s]).map((s) => all[s])
}

export const canOfferReschedule = (status) => bookingNext(status).includes('reschedule_proposed')

// A job can only be marked completed on or after its date.
export const canComplete = (preferredDate, today = todayISO()) => Boolean(preferredDate) && preferredDate <= today

export function validateReschedule(f, today = todayISO()) {
  const e = {}
  if (!f.date) e.date = 'Choose the new date.'
  else if (f.date < today) e.date = 'The new date cannot be in the past.'
  if (!TIME_RANGES.includes(f.time)) e.time = 'Choose a time.'
  return e
}
