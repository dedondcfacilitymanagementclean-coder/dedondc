import { describe, it, expect } from 'vitest'
import { categoriesFrom, filterProjects } from './projects'
import { formatMonthYear } from './format'

const list = [
  { id: 1, services: { slug: 'deep-cleaning', title: 'Deep Cleaning' } },
  { id: 2, services: { slug: 'pest-control', title: 'Pest Control Services' } },
  { id: 3, services: { slug: 'deep-cleaning', title: 'Deep Cleaning' } },
  { id: 4, services: null },
]
describe('project helpers', () => {
  it('lists each category once, sorted', () => {
    expect(categoriesFrom(list).map((c) => c.slug)).toEqual(['deep-cleaning', 'pest-control'])
  })
  it('filters by category and returns everything for "all"', () => {
    expect(filterProjects(list, 'deep-cleaning').map((p) => p.id)).toEqual([1, 3])
    expect(filterProjects(list, 'all')).toHaveLength(4)
  })
  it('formats completion dates', () => {
    expect(formatMonthYear('2026-03-15')).toBe('March 2026')
    expect(formatMonthYear(null)).toBe('')
  })
})

import { excerpt } from './format'
describe('excerpt', () => {
  it('leaves short text alone and trims long text at a word', () => {
    expect(excerpt('Short text', 50)).toBe('Short text')
    expect(excerpt('one two three four five', 12)).toBe('one two…')
  })
})
