import { SESSION_COOKIE } from '../../../shared/src/contracts'

export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

/** Parses `a=1; b=2` pairs (and API Gateway's `cookies` array, joined). Never throws. */
export const parseCookies = (raw: readonly string[]): Readonly<Record<string, string>> => {
  const out: Record<string, string> = {}
  for (const pair of raw.flatMap((c) => c.split(';'))) {
    const eq = pair.indexOf('=')
    if (eq < 1) continue
    const name = pair.slice(0, eq).trim()
    const value = pair.slice(eq + 1).trim()
    if (name !== '' && !(name in out)) out[name] = value
  }
  return out
}

/** HttpOnly, SameSite=Strict, Path=/api; Secure everywhere except plain-http local dev. */
export const sessionCookie = (token: string, secure: boolean): string =>
  [
    `${SESSION_COOKIE}=${token}`,
    'HttpOnly',
    ...(secure ? ['Secure'] : []),
    'SameSite=Strict',
    'Path=/api',
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ].join('; ')

export const clearSessionCookie = (secure: boolean): string =>
  [`${SESSION_COOKIE}=`, 'HttpOnly', ...(secure ? ['Secure'] : []), 'SameSite=Strict', 'Path=/api', 'Max-Age=0'].join('; ')
