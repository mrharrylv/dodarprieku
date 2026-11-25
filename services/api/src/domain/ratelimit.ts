/** Fixed-window rate limits per hashed IP (doc/specs/dodarprieku.md, "API"). */
import type { Repository } from '../repo/types'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

export const RATE_LIMITS = {
  applications: { limit: 5, windowMs: HOUR },
  uploads: { limit: 40, windowMs: HOUR },
  pledges: { limit: 20, windowMs: HOUR },
  subscribe: { limit: 10, windowMs: HOUR },
  login: { limit: 10, windowMs: 15 * MINUTE },
  forgot: { limit: 5, windowMs: HOUR },
  'set-password': { limit: 10, windowMs: 15 * MINUTE },
} as const

export type RateScope = keyof typeof RATE_LIMITS

/** The window's start, as an ISO string, so the key reads well in the table. */
export const windowStart = (now: Date, windowMs: number): number => Math.floor(now.getTime() / windowMs) * windowMs

/** True when this hit is within the limit. */
export const checkRateLimit = async (
  repo: Pick<Repository, 'hitRateLimit'>,
  scope: RateScope,
  ipHash: string,
  now: Date,
): Promise<boolean> => {
  const { limit, windowMs } = RATE_LIMITS[scope]
  const start = windowStart(now, windowMs)
  const expiresAt = Math.ceil((start + 2 * windowMs) / 1000)
  const count = await repo.hitRateLimit(`${scope}#${ipHash}`, new Date(start).toISOString(), expiresAt)
  return count <= limit
}
