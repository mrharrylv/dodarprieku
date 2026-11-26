import { describe, expect, it } from 'vitest'

import { mapRouteOf } from './map-route'
import { claimPath, shareUrl } from './charity-links'

describe('shareUrl', () => {
  it('is absolute, names the charity and asks for its card expanded', () => {
    const url = shareUrl('ulubele', 'lv', 'https://dodarprieku.hagroup.lv')
    expect(url).toBe('https://dodarprieku.hagroup.lv/organizacija/ulubele?vajadzibas=1')
    const parsed = new URL(url)
    expect(mapRouteOf(parsed.pathname).charitySlug).toBe('ulubele')
    expect(parsed.searchParams.get('vajadzibas')).toBe('1')
  })

  it('falls back to the page origin, never a relative address', () => {
    expect(shareUrl('a b', 'lv')).toBe(`${window.location.origin}/organizacija/a%20b?vajadzibas=1`)
  })
})

describe('claimPath', () => {
  it('opens the registration with the slug to claim', () => {
    expect(claimPath('ulubele', 'lv')).toBe('/registreties?pieprasit=ulubele')
    expect(mapRouteOf(claimPath('ulubele', 'lv').split('?')[0]!).dock).toEqual({ kind: 'register' })
  })
})
