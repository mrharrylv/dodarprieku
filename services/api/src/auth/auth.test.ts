import { describe, expect, it } from 'vitest'
import { DUMMY_HASH, hashPassword, verifyPassword } from './password'
import { createSessionToken, verifySessionToken } from './session'
import { TOKEN_TTL_SECONDS, hashIp, hashToken, newToken } from './tokens'

const SECRET = 'a-secret-that-is-long-enough-0123456789'
const NOW = new Date('2026-11-25T10:00:00Z')

describe('passwords', () => {
  it('hashes with scrypt parameters and a random salt', async () => {
    const a = await hashPassword('pareiza-parole-123')
    const b = await hashPassword('pareiza-parole-123')
    expect(a).toMatch(/^scrypt\$16384\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/)
    expect(a).not.toBe(b)
    expect(Buffer.from(a.split('$')[4]!, 'base64')).toHaveLength(16)
  })

  it('verifies the right password and refuses a wrong one', async () => {
    const h = await hashPassword('pareiza-parole-123')
    expect(await verifyPassword('pareiza-parole-123', h)).toBe(true)
    expect(await verifyPassword('nepareiza-parole', h)).toBe(false)
  })

  it('refuses malformed hashes and the dummy hash', async () => {
    expect(await verifyPassword('x', 'plain')).toBe(false)
    expect(await verifyPassword('x', 'scrypt$a$8$1$c2FsdA==$a2V5')).toBe(false)
    expect(await verifyPassword('x', 'scrypt$16384$8$1$c2FsdA==$')).toBe(false)
    expect(await verifyPassword('', DUMMY_HASH)).toBe(false)
  })
})

describe('session tokens', () => {
  const claims = { email: 'a@b.lv', role: 'charity' as const, charityId: 'c1', v: 2 }

  it('round-trips the payload with an expiry', () => {
    const t = createSessionToken(claims, SECRET, NOW)
    expect(verifySessionToken(t, SECRET, NOW)).toEqual({ ...claims, exp: NOW.getTime() / 1000 + 7 * 86400 })
  })

  it('rejects an expired token', () => {
    const t = createSessionToken(claims, SECRET, NOW, 60)
    expect(verifySessionToken(t, SECRET, new Date(NOW.getTime() + 61_000))).toBeUndefined()
  })

  it('rejects a wrong secret, a tampered payload and junk', () => {
    const t = createSessionToken(claims, SECRET, NOW)
    expect(verifySessionToken(t, `${SECRET}x`, NOW)).toBeUndefined()
    const [, sig] = t.split('.')
    const forged = Buffer.from(JSON.stringify({ ...claims, role: 'admin', exp: 9e9 })).toString('base64url')
    expect(verifySessionToken(`${forged}.${sig}`, SECRET, NOW)).toBeUndefined()
    expect(verifySessionToken('nodot', SECRET, NOW)).toBeUndefined()
    expect(verifySessionToken('a.b.c', SECRET, NOW)).toBeUndefined()
    expect(verifySessionToken('.abc', SECRET, NOW)).toBeUndefined()
  })

  it('rejects a correctly signed but malformed payload', async () => {
    const { createHmac } = await import('node:crypto')
    const sign = (data: string) => createHmac('sha256', SECRET).update(data).digest('base64url')
    const notJson = Buffer.from('{not json').toString('base64url')
    expect(verifySessionToken(`${notJson}.${sign(notJson)}`, SECRET, NOW)).toBeUndefined()
    const badShape = Buffer.from(JSON.stringify({ email: 'a', role: 'root', v: 1, exp: 9e9 })).toString('base64url')
    expect(verifySessionToken(`${badShape}.${sign(badShape)}`, SECRET, NOW)).toBeUndefined()
    const nul = Buffer.from('null').toString('base64url')
    expect(verifySessionToken(`${nul}.${sign(nul)}`, SECRET, NOW)).toBeUndefined()
  })
})

describe('single-use tokens', () => {
  it('are random, url-safe, and hashed with sha256', () => {
    const t = newToken()
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(newToken()).not.toBe(t)
    expect(hashToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })

  it('live 7 days for set-password and 1 hour for reset', () => {
    expect(TOKEN_TTL_SECONDS['set-password']).toBe(604800)
    expect(TOKEN_TTL_SECONDS.reset).toBe(3600)
  })

  it('hashes IPs with a key, never storing the address', () => {
    expect(hashIp('1.2.3.4', 'k')).toMatch(/^[0-9a-f]{64}$/)
    expect(hashIp('1.2.3.4', 'k')).not.toBe(hashIp('1.2.3.4', 'other'))
    expect(hashIp('1.2.3.4', 'k')).not.toContain('1.2.3.4')
  })
})
