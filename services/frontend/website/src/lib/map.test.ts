import { describe, expect, it } from 'vitest'

import { googleMap } from './map'

describe('googleMap', () => {
  it('builds an embed and a link for the same place', () => {
    const map = googleMap('Koku iela 10, Rīga')
    const q = encodeURIComponent('Koku iela 10, Rīga')
    expect(map.embedUrl).toBe(`https://www.google.com/maps?q=${q}&z=16&output=embed`)
    expect(map.linkUrl).toBe(`https://www.google.com/maps/search/?api=1&query=${q}`)
  })

  it('trims the query and honours the zoom', () => {
    expect(googleMap('  Rīga  ', 12).embedUrl).toBe(
      `https://www.google.com/maps?q=${encodeURIComponent('Rīga')}&z=12&output=embed`,
    )
  })

  it('escapes characters that would break the URL', () => {
    expect(googleMap('A & B #1').linkUrl).toContain('A%20%26%20B%20%231')
  })
})
