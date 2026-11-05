import { describe, it, expect } from 'vitest'
import { isValidEmail, isValidNigerianPhone, validateContact, formatNaira } from './validators'

describe('validators', () => {
  it('accepts and rejects emails', () => {
    expect(isValidEmail('a@b.co')).toBe(true)
    expect(isValidEmail('nope')).toBe(false)
    expect(isValidEmail('a@b')).toBe(false)
  })
  it('validates Nigerian phone numbers', () => {
    expect(isValidNigerianPhone('0813 065 3226')).toBe(true)
    expect(isValidNigerianPhone('+234 911 272 9711')).toBe(true)
    expect(isValidNigerianPhone('12345')).toBe(false)
    expect(isValidNigerianPhone('+1 555 123 4567')).toBe(false)
  })
  it('validates the contact form', () => {
    expect(Object.keys(validateContact({}))).toEqual(['name', 'email', 'subject', 'message'])
    expect(validateContact({ name: 'Ada', email: 'a@b.co', subject: 'Hi', message: 'Hello there' })).toEqual({})
    expect(validateContact({ name: 'Ada', email: 'a@b.co', phone: '123', subject: 'Hi', message: 'Hello' }).phone).toBeTruthy()
  })
  it('formats Naira', () => {
    expect(formatNaira(1500)).toContain('1,500')
  })
})

import { validateQuote, validateBooking, validateFiles } from './validators'

const goodQuote = {
  full_name: 'Ada Obi', email: 'ada@example.com', phone: '08130653226', preferred_contact: 'whatsapp',
  service_id: 'x', property_type: 'Office', location: 'Asaba', description: 'Clean a 3-room office', consent: true,
}
describe('quote and booking validation', () => {
  it('accepts a good quote and flags missing consent', () => {
    expect(validateQuote(goodQuote)).toEqual({})
    expect(validateQuote({ ...goodQuote, consent: false }).consent).toBeTruthy()
  })
  it('rejects past dates', () => {
    expect(validateQuote({ ...goodQuote, preferred_date: '2000-01-01' }, '2026-10-22').preferred_date).toBeTruthy()
  })
  it('requires booking date, time and address', () => {
    const e = validateBooking({ ...goodQuote }, '2026-10-22')
    expect(Object.keys(e).sort()).toEqual(['address', 'preferred_date', 'preferred_time'])
  })
  it('restricts file type, size and count', () => {
    const ok = { name: 'a.jpg', type: 'image/jpeg', size: 1000 }
    expect(validateFiles([ok])).toBe('')
    expect(validateFiles([{ ...ok, type: 'application/x-msdownload' }])).toMatch(/not allowed/)
    expect(validateFiles([{ ...ok, size: 6 * 1024 * 1024 }])).toMatch(/5 MB/)
    expect(validateFiles(Array(6).fill(ok))).toMatch(/no more than 5/)
  })
})
