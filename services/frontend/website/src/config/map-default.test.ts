import { describe, expect, it } from 'vitest'

import { CONTACT, MAP } from './site'
import { isPlaceholder } from '@/lib/placeholder'

describe('MAP, on by default', () => {
  it('is built from the contact address once the address is real', () => {
    if (isPlaceholder(CONTACT.address.street)) {
      expect(MAP).toBeNull()
      return
    }
    expect(MAP?.embedUrl).toContain(encodeURIComponent(CONTACT.address.street))
    expect(MAP?.linkUrl).toContain(encodeURIComponent(CONTACT.address.city))
  })
})
