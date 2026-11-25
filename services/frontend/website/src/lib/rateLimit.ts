import { RATE_LIMIT } from '@/config/constants'
import { readJson, writeJson, remove } from '@/lib/storage'

/**
 * A client-side submission throttle.
 *
 * Guards against a double-click and a casual script. It is NOT a security
 * control: it lives in local storage, so anyone who wants to bypass it can, in
 * one line of devtools. The endpoint must have its own limit.
 *
 * Time is injected rather than read from the clock inside, so the behaviour at
 * a window boundary is testable without waiting ten real minutes.
 */

interface AttemptLog {
  /** Epoch-millisecond timestamps of recent attempts, oldest first. */
  readonly attempts: number[]
}

const isAttemptLog = (value: unknown): value is AttemptLog =>
  typeof value === 'object' &&
  value !== null &&
  'attempts' in value &&
  Array.isArray((value as AttemptLog).attempts) &&
  (value as AttemptLog).attempts.every((n) => typeof n === 'number' && Number.isFinite(n))

/** Attempts still inside the window, as a new array. */
const recentAttempts = (log: AttemptLog | null, now: number): number[] => {
  if (log === null) return []
  const cutoff = now - RATE_LIMIT.windowMs
  return log.attempts.filter((timestamp) => timestamp > cutoff)
}

export interface RateLimitStatus {
  /** Whether another attempt is allowed right now. */
  readonly allowed: boolean
  /** Attempts left in the current window. */
  readonly remaining: number
  /** Milliseconds until the next attempt is allowed; 0 when allowed. */
  readonly retryAfterMs: number
}

export const checkRateLimit = (
  key: string,
  now: number = Date.now(),
): RateLimitStatus => {
  const attempts = recentAttempts(readJson(key, isAttemptLog), now)
  const remaining = Math.max(0, RATE_LIMIT.maxAttempts - attempts.length)

  if (remaining > 0) {
    return { allowed: true, remaining, retryAfterMs: 0 }
  }

  // Blocked until the OLDEST attempt in the window falls out of it.
  const oldest = attempts[0] ?? now
  const retryAfterMs = Math.max(0, oldest + RATE_LIMIT.windowMs - now)

  return { allowed: false, remaining: 0, retryAfterMs }
}

/**
 * Record an attempt. Returns the status AFTER recording, so a caller can show
 * "2 attempts left" without a second read.
 */
export const recordAttempt = (
  key: string,
  now: number = Date.now(),
): RateLimitStatus => {
  const attempts = [...recentAttempts(readJson(key, isAttemptLog), now), now]
  writeJson(key, { attempts })

  const remaining = Math.max(0, RATE_LIMIT.maxAttempts - attempts.length)
  const oldest = attempts[0] ?? now

  return {
    allowed: remaining > 0,
    remaining,
    retryAfterMs: remaining > 0 ? 0 : Math.max(0, oldest + RATE_LIMIT.windowMs - now),
  }
}

/**
 * Clear the log.
 *
 * Called after a SUCCESSFUL submission: the limit exists to stop repeated
 * failures and spam, and someone whose message actually went through should not
 * then be locked out of sending a second, legitimate one.
 */
export const clearRateLimit = (key: string): void => remove(key)

/** Whole minutes to wait, rounded up, for "try again in 3 minutes". */
export const retryAfterMinutes = (retryAfterMs: number): number =>
  Math.max(1, Math.ceil(retryAfterMs / 60_000))
