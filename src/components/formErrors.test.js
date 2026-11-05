import { describe, it, expect, vi } from 'vitest'
import { errorCode, friendlyError } from './FormParts'

describe('form error codes', () => {
  it('recognises network failures', () => {
    expect(errorCode(new TypeError('Failed to fetch'))).toBe('NETWORK')
    expect(errorCode({ message: 'TypeError: Failed to fetch' })).toBe('NETWORK')
  })
  it('uses the database error code when there is one', () => {
    expect(errorCode({ code: 'PGRST202', message: 'x' })).toBe('PGRST202')
    expect(errorCode({ message: 'x', status: 401 })).toBe('401')
    expect(errorCode(null)).toBe('')
  })
  it('keeps friendly messages for known problems and adds a code to unknown ones', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(friendlyError({ message: 'Too many requests. Please try again later.' })).toMatch(/Too many/)
    expect(friendlyError({ code: '42501', message: 'permission denied' })).toMatch(/Support code: 42501/)
    expect(friendlyError({ code: '42501', message: 'permission denied for table x' })).not.toMatch(/permission denied/)
  })
})
