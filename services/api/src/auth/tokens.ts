/** Single-use emailed tokens: 32 random bytes; only their SHA-256 is stored. */
import { createHash, createHmac, randomBytes } from 'node:crypto'

export type TokenPurpose = 'set-password' | 'reset'

export const TOKEN_TTL_SECONDS: Readonly<Record<TokenPurpose, number>> = {
  'set-password': 7 * 24 * 60 * 60,
  reset: 60 * 60,
}

export const newToken = (): string => randomBytes(32).toString('base64url')

export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex')

/** Keyed hash of an IP for rate-limit keys: the raw address is never stored. */
export const hashIp = (ip: string, secret: string): string =>
  createHmac('sha256', secret).update(`ip:${ip}`).digest('hex')
