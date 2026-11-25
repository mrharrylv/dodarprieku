/**
 * Session tokens: base64url(JSON payload) "." base64url(HMAC-SHA256). The
 * payload is `{ email, role, charityId?, v, exp }`; `v` is the account's
 * sessionVersion, so bumping it (new password) signs every old session out.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Role } from '../../../shared/src/contracts'
import { SESSION_MAX_AGE_SECONDS } from '../http/cookies'

export interface SessionPayload {
  readonly email: string
  readonly role: Role
  readonly charityId?: string
  readonly v: number
  /** Epoch seconds. */
  readonly exp: number
}

const sign = (data: string, secret: string): Buffer => createHmac('sha256', secret).update(data).digest()

export const createSessionToken = (
  claims: Omit<SessionPayload, 'exp'>,
  secret: string,
  now: Date,
  ttlSeconds: number = SESSION_MAX_AGE_SECONDS,
): string => {
  const payload: SessionPayload = { ...claims, exp: Math.floor(now.getTime() / 1000) + ttlSeconds }
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${data}.${sign(data, secret).toString('base64url')}`
}

const isPayload = (v: unknown): v is SessionPayload => {
  if (typeof v !== 'object' || v === null) return false
  const p = v as Record<string, unknown>
  return (
    typeof p.email === 'string' &&
    (p.role === 'charity' || p.role === 'admin') &&
    (p.charityId === undefined || typeof p.charityId === 'string') &&
    typeof p.v === 'number' &&
    typeof p.exp === 'number'
  )
}

/** The payload when the signature is good and it has not expired; otherwise undefined. */
export const verifySessionToken = (token: string, secret: string, now: Date): SessionPayload | undefined => {
  const dot = token.indexOf('.')
  if (dot < 1 || dot !== token.lastIndexOf('.')) return undefined
  const data = token.slice(0, dot)
  const given = Buffer.from(token.slice(dot + 1), 'base64url')
  const expected = sign(data, secret)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return undefined
  let payload: unknown
  try {
    payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'))
  } catch {
    return undefined
  }
  if (!isPayload(payload)) return undefined
  return payload.exp > Math.floor(now.getTime() / 1000) ? payload : undefined
}
