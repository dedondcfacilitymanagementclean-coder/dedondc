import { describe, it, expect } from 'vitest'
import { initials, clampRating } from './useTestimonials'

describe('initials', () => {
  it('uses first and last name', () => {
    expect(initials('Ada Obi')).toBe('AO')
    expect(initials('  chidi  nwosu okafor ')).toBe('CO')
  })
  it('handles one word and empty input', () => {
    expect(initials('Zenith')).toBe('Z')
    expect(initials('')).toBe('?')
    expect(initials(null)).toBe('?')
  })
})

describe('clampRating', () => {
  it('keeps ratings between 0 and 5', () => {
    expect(clampRating(4)).toBe(4)
    expect(clampRating(9)).toBe(5)
    expect(clampRating(-2)).toBe(0)
    expect(clampRating(null)).toBe(0)
    expect(clampRating('abc')).toBe(0)
  })
})
