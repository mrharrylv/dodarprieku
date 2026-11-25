import { describe, expect, it } from 'vitest'
import { summary } from '../test/fixtures'
import { ApiError } from './api'
import { errorMessage, fieldErrorMessage, messageForCode } from './errors'
import { nameLookup } from './names'
import { fileSlug, filterSubscribers, subscribersOf } from './subscribers'

describe('errors', () => {
  it('maps codes, unknown throwables and field codes to copy', () => {
    expect(messageForCode('network')).toMatch(/interneta/)
    expect(errorMessage(new ApiError('rate_limited', 429))).toMatch(/Pārāk daudz/)
    expect(errorMessage(new Error('x'))).toMatch(/Servera kļūda/)
    expect(fieldErrorMessage('required')).toBe('Obligāts lauks.')
    expect(fieldErrorMessage('nonsense')).toBe('Pārbaudiet šo lauku.')
  })
})

describe('nameLookup', () => {
  const names = nameLookup([summary({ id: 'c1', name: 'Ulubele', category: 'dzivnieku-patversme' })])
  it('names charities and needs', () => {
    expect(names.name('c1')).toBe('Ulubele')
    expect(names.name('zz')).toBe('zz')
    expect(names.need('c1', 'sausa-bariba-suniem')).toBe('Sausā barība suņiem')
    expect(names.need('c1', 'custom:2')).toBe('Cita vajadzība')
    expect(names.need('zz', 'x')).toBe('x')
  })
})

describe('subscribers', () => {
  const rows = [
    { email: 'janis@a.lv', name: 'Jānis', charityIds: ['c1'], createdAt: '1' },
    { email: 'x@b.lv', charityIds: [], createdAt: '2' },
  ]
  it('filters by email or name without diacritics, and by charity', () => {
    expect(filterSubscribers(rows, 'JANIS')).toHaveLength(1)
    expect(filterSubscribers(rows, '')).toHaveLength(2)
    expect(filterSubscribers(rows, 'b.lv')).toHaveLength(1)
    expect(subscribersOf(rows, 'c1').map((r) => r.email)).toEqual(['janis@a.lv'])
  })
  it('slugs names for files', () => {
    expect(fileSlug('Dzīvnieku patversme "Ulubele"!')).toBe('dzivnieku-patversme-ulubele')
  })
})

