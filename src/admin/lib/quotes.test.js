import { describe, it, expect } from 'vitest'
import { nextStatuses, manualStatuses, safeSearch, parseAmount, validateQuotation, waNumber, whatsappUrl, QUOTE_TRANSITIONS } from './quotes'
import { formatMoney, formatDate } from '../../lib/format'

describe('quote status rules', () => {
  it('only offers allowed next steps', () => {
    expect(nextStatuses('new')).toContain('under_review')
    expect(nextStatuses('new')).not.toContain('accepted')
    expect(nextStatuses('accepted')).toEqual(['closed'])
    expect(nextStatuses('mystery')).toEqual([])
  })
  it('leaves "prepared" and "sent" to the quotation buttons', () => {
    for (const s of Object.keys(QUOTE_TRANSITIONS)) {
      expect(manualStatuses(s)).not.toContain('quotation_prepared')
      expect(manualStatuses(s)).not.toContain('quotation_sent')
    }
    expect(manualStatuses('new')).toEqual(['under_review', 'declined', 'closed'])
  })
})

describe('safeSearch', () => {
  it('removes characters that could alter a database filter', () => {
    expect(safeSearch('ada,status.eq.new)')).toBe('ada status.eq.new')
    expect(safeSearch('50% off * "x" (y)')).toBe('50 off x y')
    expect(safeSearch('  Ada   Obi ')).toBe('Ada Obi')
    expect(safeSearch(null)).toBe('')
    expect(safeSearch('x'.repeat(200))).toHaveLength(60)
  })
})

describe('amounts and quotation validation', () => {
  it('parses naira amounts', () => {
    expect(parseAmount('150,000.50')).toBe(150000.5)
    expect(parseAmount('₦ 2500')).toBe(2500)
    expect(Number.isNaN(parseAmount('12.345'))).toBe(true)
    expect(Number.isNaN(parseAmount('abc'))).toBe(true)
    expect(Number.isNaN(parseAmount('-5'))).toBe(true)
  })
  const ok = { amount: '150000', currency: 'NGN', description: 'Office cleaning, 3 rooms', expires_on: '' }
  it('accepts a good quotation', () => expect(validateQuotation(ok, '2026-10-30')).toEqual({}))
  it('flags every bad field', () => {
    const e = validateQuotation({ amount: '0', currency: 'XXX', description: 'short', expires_on: '2020-01-01' }, '2026-10-30')
    expect(Object.keys(e).sort()).toEqual(['amount', 'currency', 'description', 'expires_on'])
  })
})

describe('WhatsApp links', () => {
  it('builds international numbers and refuses non-Nigerian ones', () => {
    expect(waNumber('0813 065 3226')).toBe('2348130653226')
    expect(waNumber('+234 911 272 9711')).toBe('2349112729711')
    expect(waNumber('12345')).toBe('')
    expect(whatsappUrl('08130653226', 'Hi & hello')).toBe('https://wa.me/2348130653226?text=Hi%20%26%20hello')
    expect(whatsappUrl('555', 'x')).toBe('')
  })
})

describe('money and date formatting', () => {
  it('formats naira and other currencies', () => {
    expect(formatMoney(150000.5, 'NGN')).toMatch(/150,000\.50/)
    expect(formatMoney(10, 'USD')).toMatch(/10\.00/)
    expect(formatMoney(10, 'bad!')).toBe('bad! 10')
  })
  it('formats date-only values without shifting the day', () => {
    expect(formatDate('2026-10-30')).toMatch(/30 Oct 2026/)
    expect(formatDate(null)).toBe('')
  })
})
