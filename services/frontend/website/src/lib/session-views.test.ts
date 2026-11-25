import { describe, expect, it } from 'vitest'

import { STORAGE_KEYS } from '@/config/site'
import { markViewed, MAX_REMEMBERED_VIEWS, readViewed } from './session-views'

describe('session views', () => {
  beforeEach(() => window.sessionStorage.clear())

  it('counts a charity once per tab', () => {
    expect(markViewed('a')).toBe(true)
    expect(markViewed('a')).toBe(false)
    expect(markViewed('b')).toBe(true)
    expect(readViewed()).toEqual(['a', 'b'])
  })

  it('treats garbage in storage as nothing viewed', () => {
    window.sessionStorage.setItem(STORAGE_KEYS.viewedCharities, '{nope')
    expect(readViewed()).toEqual([])
    window.sessionStorage.setItem(STORAGE_KEYS.viewedCharities, '[1,2]')
    expect(readViewed()).toEqual([])
  })

  it('still counts when storage is missing or throws', () => {
    expect(markViewed('a', null)).toBe(true)
    expect(readViewed(null)).toEqual([])
    const broken = { getItem: () => null, setItem: () => { throw new Error('quota') } } as unknown as Storage
    expect(markViewed('a', broken)).toBe(true)
    const unreadable = { getItem: () => { throw new Error('blocked') } } as unknown as Storage
    expect(readViewed(unreadable)).toEqual([])
  })

  it('forgets the oldest past the cap', () => {
    for (let i = 0; i <= MAX_REMEMBERED_VIEWS; i += 1) markViewed(`id-${i}`)
    const viewed = readViewed()
    expect(viewed).toHaveLength(MAX_REMEMBERED_VIEWS)
    expect(viewed[0]).toBe('id-1')
  })
})
