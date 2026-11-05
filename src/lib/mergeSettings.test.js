import { describe, it, expect } from 'vitest'
import { mergeSettings } from './mergeSettings'

describe('mergeSettings', () => {
  const defaults = { mission: 'Real mission', values: [{ title: 'A' }], company: { rc_number: '7211364', phone: '1' } }
  it('keeps defaults when the database has blanks or placeholders', () => {
    const r = mergeSettings(defaults, { mission: '', values: [] })
    expect(r.mission).toBe('Real mission')
    expect(r.values).toHaveLength(1)
    expect(mergeSettings(defaults, { mission: '[Starter text: replace]' }).mission).toBe('Real mission')
  })
  it('lets real database edits win, including inside nested objects', () => {
    const r = mergeSettings(defaults, { mission: 'New mission', company: { phone: '2' } })
    expect(r.mission).toBe('New mission')
    expect(r.company).toEqual({ rc_number: '7211364', phone: '2' })
  })
})
