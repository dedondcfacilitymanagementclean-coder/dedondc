import { describe, it, expect } from 'vitest'
import { slugify, linesToList, validateService, validateProject, validateTestimonial, validateCompany, validateLegal, templateToText } from './content'
import { fitWithin, validateImageFile } from './image'

describe('slugify', () => {
  it('makes safe web addresses', () => {
    expect(slugify('Hotel & Serviced-Apartment Cleaning')).toBe('hotel-and-serviced-apartment-cleaning')
    expect(slugify('  Café   Déjà vu! ')).toBe('cafe-deja-vu')
    expect(slugify('***')).toBe('')
    expect(slugify('a'.repeat(100))).toHaveLength(60)
  })
})

describe('services', () => {
  const ok = { title: 'Office Cleaning', slug: 'office-cleaning', short_description: 'Neat offices.', description: 'Text', benefits: 'Fast\nSafe', icon: '🧹' }
  it('accepts a good service', () => expect(validateService(ok)).toEqual({}))
  it('flags bad fields', () => {
    const e = validateService({ ...ok, title: 'x', slug: 'Bad Slug', short_description: 'y'.repeat(161), benefits: Array(13).fill('b').join('\n') })
    expect(Object.keys(e).sort()).toEqual(['benefits', 'short_description', 'slug', 'title'])
  })
  it('turns lines into a list and ignores blanks', () => expect(linesToList(' a \n\n b ')).toEqual(['a', 'b']))
})

describe('projects and testimonials', () => {
  it('needs a photo and a title', () => {
    expect(Object.keys(validateProject({ title: 'A', description: '' }, false)).sort()).toEqual(['image', 'title'])
    expect(validateProject({ title: 'Hotel deep clean', description: '' }, true)).toEqual({})
  })
  it('checks testimonial fields and optional rating', () => {
    const base = { customer_name: 'Ada Obi', customer_role: '', message: 'Excellent and punctual work.', rating: '' }
    expect(validateTestimonial(base)).toEqual({})
    expect(validateTestimonial({ ...base, rating: 5 })).toEqual({})
    expect(validateTestimonial({ ...base, rating: 6 }).rating).toBeTruthy()
    expect(validateTestimonial({ ...base, message: 'short' }).message).toBeTruthy()
  })
})

describe('company details', () => {
  const ok = { name: 'DE DON DC', phone_primary: '+234 813 065 3226', phone_secondary: '', whatsapp: '2348130653226', email: 'a@b.com', map_embed_url: '', address: '', opening_hours: '' }
  it('accepts good details', () => expect(validateCompany(ok)).toEqual({}))
  it('rejects bad phone, email and unsafe map links', () => {
    const e = validateCompany({ ...ok, phone_primary: 'abc', email: 'nope', whatsapp: '0813', map_embed_url: 'https://evil.example/x' })
    expect(Object.keys(e).sort()).toEqual(['email', 'map_embed_url', 'phone_primary', 'whatsapp'])
    expect(validateCompany({ ...ok, map_embed_url: 'https://www.google.com/maps/embed?pb=123' })).toEqual({})
    expect(validateCompany({ ...ok, map_embed_url: 'javascript:alert(1)' }).map_embed_url).toBeTruthy()
  })
})

describe('legal text', () => {
  const long = 'This is a complete policy sentence. '.repeat(5)
  it('accepts reviewed text', () => expect(validateLegal(long)).toEqual({}))
  it('blocks leftover template notes and short text', () => {
    expect(validateLegal(long + ' [Business to confirm retention periods.]').body).toMatch(/bracketed/)
    expect(validateLegal('too short').body).toMatch(/short/)
  })
  it('converts template sections to headed text', () => expect(templateToText([['A', 'one'], ['B', 'two']])).toBe('## A\n\none\n\n## B\n\ntwo'))
})

describe('pictures', () => {
  it('scales down only', () => {
    expect(fitWithin(4000, 2000, 1600)).toEqual({ width: 1600, height: 800 })
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 })
    expect(fitWithin(0, 0, 1600)).toEqual({ width: 0, height: 0 })
  })
  it('accepts only real picture types and sizes', () => {
    expect(validateImageFile({ type: 'image/png', size: 1000 })).toBe('')
    expect(validateImageFile({ type: 'application/pdf', size: 1000 })).toMatch(/JPG/)
    expect(validateImageFile({ type: 'image/jpeg', size: 20 * 1024 * 1024 })).toMatch(/12 MB/)
    expect(validateImageFile(null)).toMatch(/Choose/)
  })
})
