import { describe, it, expect, beforeEach, vi } from 'vitest'

import { readJson, readRaw, remove, writeJson, writeRaw } from './storage'

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'string')

beforeEach(() => {
  window.localStorage.clear()
})

describe('raw access', () => {
  it('round-trips a value', () => {
    expect(writeRaw('k', 'v')).toBe(true)
    expect(readRaw('k')).toBe('v')
  })

  it('returns null for a key that was never set', () => {
    expect(readRaw('missing')).toBeNull()
  })

  it('removes a key', () => {
    writeRaw('k', 'v')
    remove('k')
    expect(readRaw('k')).toBeNull()
  })

  it('removing a missing key is not an error', () => {
    expect(() => remove('never-existed')).not.toThrow()
  })
})

describe('JSON access', () => {
  it('round-trips a validated value', () => {
    writeJson('k', ['a', 'b'])
    expect(readJson('k', isStringArray)).toEqual(['a', 'b'])
  })

  it('returns null when the stored value fails the guard', () => {
    // Data written by an older version of the site with a different shape must
    // not crash the page: it is simply ignored.
    writeJson('k', [1, 2, 3])
    expect(readJson('k', isStringArray)).toBeNull()
  })

  it('returns null for malformed JSON', () => {
    window.localStorage.setItem('k', '{not json')
    expect(readJson('k', isStringArray)).toBeNull()
  })

  it('returns null for a missing key', () => {
    expect(readJson('missing', isStringArray)).toBeNull()
  })

  it('reports failure for a value that cannot be serialised', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular

    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(writeJson('k', circular)).toBe(false)
  })
})

describe('when storage throws', () => {
  it('reads return null instead of propagating', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })

    // Safari private mode, or a browser configured to block site data. An
    // unguarded read here takes the whole page down as a white screen.
    expect(readRaw('k')).toBeNull()
    expect(readJson('k', isStringArray)).toBeNull()
  })

  it('writes report failure instead of propagating', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    expect(writeRaw('k', 'v')).toBe(false)
    expect(writeJson('k', ['a'])).toBe(false)
  })

  it('removes stay silent', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })

    expect(() => remove('k')).not.toThrow()
  })
})
