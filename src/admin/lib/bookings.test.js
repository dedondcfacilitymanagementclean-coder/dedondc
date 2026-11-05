import { describe, it, expect } from 'vitest'
import { bookingNext, bookingActions, canOfferReschedule, canComplete, validateReschedule } from './bookings'

describe('booking rules', () => {
  it('offers only allowed next steps', () => {
    expect(bookingNext('pending_review')).toContain('confirmed')
    expect(bookingNext('pending_review')).not.toContain('completed')
    expect(bookingNext('completed')).toEqual([])
    expect(bookingNext('cancelled')).toEqual([])
    expect(bookingNext('mystery')).toEqual([])
  })
  it('words the confirm button for a customer who agreed to a new time', () => {
    const t = (s) => bookingActions(s).map((a) => a[1])
    expect(t('pending_review')).toContain('Confirm booking')
    expect(t('reschedule_proposed')).toContain('Customer agreed: confirm new time')
    expect(t('declined')).toEqual(['Reopen for review'])
    expect(t('completed')).toEqual([])
  })
  it('asks for confirmation before declining or cancelling', () => {
    const risky = bookingActions('confirmed').filter((a) => a[3]).map((a) => a[0])
    expect(risky).toEqual(['cancelled'])
  })
  it('offers a reschedule only where allowed', () => {
    expect(canOfferReschedule('pending_review')).toBe(true)
    expect(canOfferReschedule('confirmed')).toBe(true)
    expect(canOfferReschedule('completed')).toBe(false)
  })
  it('allows completion only on or after the job date', () => {
    expect(canComplete('2026-11-01', '2026-10-30')).toBe(false)
    expect(canComplete('2026-10-30', '2026-10-30')).toBe(true)
    expect(canComplete('2026-10-01', '2026-10-30')).toBe(true)
    expect(canComplete(null, '2026-10-30')).toBe(false)
  })
  it('validates a reschedule proposal', () => {
    expect(validateReschedule({ date: '2026-11-05', time: 'Flexible / any time' }, '2026-10-30')).toEqual({})
    expect(Object.keys(validateReschedule({ date: '2026-10-01', time: '' }, '2026-10-30')).sort()).toEqual(['date', 'time'])
    expect(validateReschedule({ date: '', time: 'Flexible / any time' }, '2026-10-30').date).toMatch(/Choose/)
  })
})
