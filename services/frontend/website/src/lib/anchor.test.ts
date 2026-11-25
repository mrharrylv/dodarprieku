import { describe, it, expect } from 'vitest'

import { anchorId } from './anchor'

describe('anchorId', () => {
  it('reads the id a fragment names', () => {
    expect(anchorId('#delivery')).toBe('delivery')
  })

  it('decodes it, as the browser does', () => {
    expect(anchorId(`#${encodeURIComponent('über-uns')}`)).toBe('über-uns')
  })

  it.each(['', '#'])('is null for no fragment: %j', (hash) => {
    expect(anchorId(hash)).toBeNull()
  })

  // External input: a malformed escape makes decodeURIComponent throw.
  it('is null for a fragment nobody can decode', () => {
    expect(anchorId('#%E0%A4%A')).toBeNull()
  })
})
