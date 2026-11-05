import { describe, it, expect } from 'vitest'
import { describeDetails } from './ActivityLog'

describe('activity details', () => {
  it('summarises without showing raw data', () => {
    expect(describeDetails({ reference: 'QR-1', from: 'new', to: 'under_review' })).toBe('QR-1 · New → Under review')
    expect(describeDetails({ title: 'Office Cleaning' })).toBe('Office Cleaning')
    expect(describeDetails({ key: 'legal_terms' })).toBe('Legal terms')
    expect(describeDetails({ direction: 'up' })).toBe('moved up')
    expect(describeDetails({})).toBe('')
    expect(describeDetails(undefined)).toBe('')
  })
})
