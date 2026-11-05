import { describe, it, expect } from 'vitest'
import { passwordProblem } from './password'
import { describeLoginError } from './authErrors'
import { BOOKING_STATUS, QUOTE_STATUS, humanize, statusLabel } from './status'
import { formatDateTime } from '../../lib/format'

describe('passwordProblem', () => {
  it('rejects short, letter-only and number-only passwords', () => {
    expect(passwordProblem('Short1')).toMatch(/at least 10/)
    expect(passwordProblem('onlylettersssss')).toMatch(/letter and one number/)
    expect(passwordProblem('1234567890123')).toMatch(/letter and one number/)
  })
  it('checks that both entries match', () => {
    expect(passwordProblem('GoodPass12345', 'Different12345')).toMatch(/do not match/)
    expect(passwordProblem('GoodPass12345', 'GoodPass12345')).toBe('')
  })
})

describe('describeLoginError', () => {
  it('never reveals whether the email exists', () => {
    expect(describeLoginError({ status: 400, message: 'Invalid login credentials' })).toBe('Incorrect email or password.')
    expect(describeLoginError({ status: 400, message: 'User not found' })).toBe('Incorrect email or password.')
  })
  it('explains rate limiting and network failures', () => {
    expect(describeLoginError({ status: 429, message: 'x' })).toMatch(/Too many attempts/)
    expect(describeLoginError({ status: 0, message: 'Failed to fetch' })).toMatch(/internet connection/)
    expect(describeLoginError(null)).toBe('')
  })
})

describe('status labels', () => {
  it('maps database statuses to readable text', () => {
    expect(statusLabel(QUOTE_STATUS, 'quotation_sent')).toBe('Quotation sent')
    expect(statusLabel(BOOKING_STATUS, 'pending_review')).toBe('Pending review')
    expect(statusLabel(BOOKING_STATUS, 'something_new')).toBe('Something new')
    expect(humanize('profile_updated')).toBe('Profile updated')
  })
})

describe('formatDateTime', () => {
  it('formats in Nigerian time and tolerates bad input', () => {
    expect(formatDateTime('2026-10-30T00:22:00Z')).toMatch(/30 Oct 2026/)
    expect(formatDateTime('nonsense')).toBe('')
  })
})
