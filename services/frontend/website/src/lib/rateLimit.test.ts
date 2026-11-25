import { describe, it, expect, beforeEach, vi } from 'vitest'

import { RATE_LIMIT } from '@/config/constants'
import {
  checkRateLimit,
  clearRateLimit,
  recordAttempt,
  retryAfterMinutes,
} from './rateLimit'

const KEY = 'test.attempts'
const T0 = 1_700_000_000_000

beforeEach(() => {
  window.localStorage.clear()
})

describe('checkRateLimit', () => {
  it('allows the first attempt', () => {
    const status = checkRateLimit(KEY, T0)
    expect(status.allowed).toBe(true)
    expect(status.remaining).toBe(RATE_LIMIT.maxAttempts)
    expect(status.retryAfterMs).toBe(0)
  })

  it('counts down as attempts are recorded', () => {
    recordAttempt(KEY, T0)
    expect(checkRateLimit(KEY, T0).remaining).toBe(RATE_LIMIT.maxAttempts - 1)

    recordAttempt(KEY, T0 + 1000)
    expect(checkRateLimit(KEY, T0 + 1000).remaining).toBe(RATE_LIMIT.maxAttempts - 2)
  })

  it('blocks once the allowance is spent', () => {
    for (let i = 0; i < RATE_LIMIT.maxAttempts; i++) recordAttempt(KEY, T0 + i)

    const status = checkRateLimit(KEY, T0 + RATE_LIMIT.maxAttempts)
    expect(status.allowed).toBe(false)
    expect(status.remaining).toBe(0)
    expect(status.retryAfterMs).toBeGreaterThan(0)
  })

  it('frees up an attempt once the oldest one leaves the window', () => {
    for (let i = 0; i < RATE_LIMIT.maxAttempts; i++) recordAttempt(KEY, T0 + i)

    // One millisecond before the oldest attempt expires: still blocked.
    const justBefore = T0 + RATE_LIMIT.windowMs - 1
    expect(checkRateLimit(KEY, justBefore).allowed).toBe(false)

    // One millisecond after: allowed again.
    const justAfter = T0 + RATE_LIMIT.windowMs + 1
    expect(checkRateLimit(KEY, justAfter).allowed).toBe(true)
  })

  it('reports how long is left, measured from the OLDEST attempt', () => {
    recordAttempt(KEY, T0)
    for (let i = 1; i < RATE_LIMIT.maxAttempts; i++) recordAttempt(KEY, T0 + i * 1000)

    const now = T0 + 60_000
    const status = checkRateLimit(KEY, now)
    expect(status.retryAfterMs).toBe(T0 + RATE_LIMIT.windowMs - now)
  })
})

describe('recordAttempt', () => {
  it('returns the status after recording, not before', () => {
    const status = recordAttempt(KEY, T0)
    expect(status.remaining).toBe(RATE_LIMIT.maxAttempts - 1)
  })

  it('drops attempts that have aged out rather than growing forever', () => {
    recordAttempt(KEY, T0)
    const later = recordAttempt(KEY, T0 + RATE_LIMIT.windowMs * 2)

    // The first attempt is long gone, so this counts as the only one.
    expect(later.remaining).toBe(RATE_LIMIT.maxAttempts - 1)
  })
})

describe('clearRateLimit', () => {
  it('restores the full allowance', () => {
    for (let i = 0; i < RATE_LIMIT.maxAttempts; i++) recordAttempt(KEY, T0 + i)
    expect(checkRateLimit(KEY, T0).allowed).toBe(false)

    clearRateLimit(KEY)

    expect(checkRateLimit(KEY, T0).allowed).toBe(true)
    expect(checkRateLimit(KEY, T0).remaining).toBe(RATE_LIMIT.maxAttempts)
  })
})

describe('corrupt stored data', () => {
  it.each([
    ['not json at all', 'wat'],
    ['the wrong shape', '{"nope":1}'],
    ['attempts that are not numbers', '{"attempts":["a","b"]}'],
    ['a bare array', '[1,2,3]'],
  ])('ignores %s and allows the attempt', (_label, raw) => {
    window.localStorage.setItem(KEY, raw)

    // A visitor whose storage holds junk: an older version of the site, or a
    // hand edit: must not be permanently locked out of the contact form.
    const status = checkRateLimit(KEY, T0)
    expect(status.allowed).toBe(true)
    expect(status.remaining).toBe(RATE_LIMIT.maxAttempts)
  })
})

describe('storage unavailable', () => {
  it('still allows attempts when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: storage is disabled')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError: storage is disabled')
    })

    // Private browsing must not break the contact form. The throttle simply
    // stops working, which is the correct trade: it is a courtesy, not a
    // security control.
    expect(() => recordAttempt(KEY, T0)).not.toThrow()
    expect(checkRateLimit(KEY, T0).allowed).toBe(true)
  })
})

describe('retryAfterMinutes', () => {
  it('rounds up, and never says zero', () => {
    expect(retryAfterMinutes(0)).toBe(1)
    expect(retryAfterMinutes(1)).toBe(1)
    expect(retryAfterMinutes(60_000)).toBe(1)
    expect(retryAfterMinutes(60_001)).toBe(2)
    expect(retryAfterMinutes(9 * 60_000)).toBe(9)
  })
})
