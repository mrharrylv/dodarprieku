import { describe, expect, it } from 'vitest'
import { hashToken } from '../auth/tokens'
import { createSessionToken } from '../auth/session'
import { PASSWORD, SECRET, asCharity, call, cookieToken, data, errorOf, putAccount, world } from '../test/helpers'
import { FORGOT_FLOOR_MS, createToken } from './auth'

describe('login, me, logout', () => {
  it('logs in, sets a strict secure cookie, and answers /me', async () => {
    const w = world()
    await putAccount(w.deps, { email: 'admin@hagroup.lv', role: 'admin' })
    const res = await call(w.app, 'POST', '/auth/login', { body: { email: ' Admin@HAGroup.lv ', password: PASSWORD } })
    expect(data(res)).toEqual({ email: 'admin@hagroup.lv', role: 'admin' })
    expect(res.cookies?.[0]).toMatch(/^dodar_session=[^;]+; HttpOnly; Secure; SameSite=Strict; Path=\/api; Max-Age=604800$/)
    expect(data(await call(w.app, 'GET', '/auth/me', { cookie: cookieToken(res) }))).toEqual({ email: 'admin@hagroup.lv', role: 'admin' })
  })

  it('drops Secure for plain-http local dev', async () => {
    const w = world({ local: true })
    await putAccount(w.deps, { email: 'a@b.lv', role: 'admin' })
    const res = await call(w.app, 'POST', '/auth/login', { body: { email: 'a@b.lv', password: PASSWORD } })
    expect(res.cookies?.[0]).not.toContain('Secure')
  })

  it('answers 401 alike for a wrong password, no password yet, and no account', async () => {
    const w = world()
    await putAccount(w.deps, { email: 'a@b.lv', role: 'admin' })
    await putAccount(w.deps, { email: 'new@b.lv', role: 'admin', passwordHash: undefined as never })
    for (const body of [
      { email: 'a@b.lv', password: 'wrong-password' },
      { email: 'new@b.lv', password: PASSWORD },
      { email: 'nobody@b.lv', password: PASSWORD },
      { email: '', password: '' },
    ]) {
      expect(errorOf(await call(w.app, 'POST', '/auth/login', { body }))).toEqual({ status: 401, error: 'unauthorized' })
    }
    expect(w.deps.logs.join('\n')).not.toContain('wrong-password')
  })

  it('rate limits login to 10 per 15 minutes', async () => {
    const w = world()
    for (let i = 0; i < 10; i += 1) await call(w.app, 'POST', '/auth/login', { body: {} })
    expect(errorOf(await call(w.app, 'POST', '/auth/login', { body: {} })).status).toBe(429)
  })

  it('logs out by clearing the cookie', async () => {
    const w = world()
    const res = await call(w.app, 'POST', '/auth/logout')
    expect(data(res)).toEqual({})
    expect(res.cookies?.[0]).toContain('Max-Age=0')
  })

  it('revokes the session on logout, so a copied token stops working', async () => {
    const w = world()
    const { cookie } = await asCharity(w)
    expect(data(await call(w.app, 'GET', '/auth/me', { cookie })).role).toBe('charity')
    expect(data(await call(w.app, 'POST', '/auth/logout', { cookie }))).toEqual({})
    expect(errorOf(await call(w.app, 'GET', '/auth/me', { cookie })).status).toBe(401)
    expect((await w.deps.repo.getAccount('owner@kepa.example.com'))?.sessionVersion).toBe(1)
    expect(data(await call(w.app, 'GET', '/auth/me', { cookie: await w.login('owner@kepa.example.com') })).role).toBe('charity')
  })

  it('refuses /me without, or with a stale, session', async () => {
    const w = world()
    const { cookie } = await asCharity(w)
    expect(errorOf(await call(w.app, 'GET', '/auth/me')).status).toBe(401)
    expect(errorOf(await call(w.app, 'GET', '/auth/me', { cookie: 'garbage' })).status).toBe(401)
    const account = (await w.deps.repo.getAccount('owner@kepa.example.com'))!
    await w.deps.repo.putAccount({ ...account, sessionVersion: 5 })
    expect(errorOf(await call(w.app, 'GET', '/auth/me', { cookie })).status).toBe(401)
  })

  it('refuses a token whose role or charity no longer matches the account', async () => {
    const w = world()
    await putAccount(w.deps, { email: 'a@b.lv', role: 'charity', charityId: 'c1' })
    const now = w.deps.now()
    const asAdminToken = createSessionToken({ email: 'a@b.lv', role: 'admin', v: 0 }, SECRET, now)
    const otherCharity = createSessionToken({ email: 'a@b.lv', role: 'charity', charityId: 'c9', v: 0 }, SECRET, now)
    const gone = createSessionToken({ email: 'gone@b.lv', role: 'admin', v: 0 }, SECRET, now)
    for (const cookie of [asAdminToken, otherCharity, gone]) {
      expect(errorOf(await call(w.app, 'GET', '/auth/me', { cookie })).status).toBe(401)
    }
  })
})

describe('set-password', () => {
  it('sets the password, burns the token, bumps the session version and logs in', async () => {
    const w = world()
    await putAccount(w.deps, { email: 'a@b.lv', role: 'charity', charityId: 'c1', passwordHash: undefined as never })
    const token = await createToken(w.deps, 'a@b.lv', 'set-password')
    const res = await call(w.app, 'POST', '/auth/set-password', { body: { token, password: 'jauna-parole-123' } })
    expect(data(res)).toEqual({ email: 'a@b.lv', role: 'charity', charityId: 'c1' })
    expect((await w.deps.repo.getAccount('a@b.lv'))?.sessionVersion).toBe(1)
    expect(data(await call(w.app, 'GET', '/auth/me', { cookie: cookieToken(res) })).email).toBe('a@b.lv')
    expect(w.deps.repo.tokenCount()).toBe(0)
    const again = await call(w.app, 'POST', '/auth/set-password', { body: { token, password: 'jauna-parole-123' } })
    expect(errorOf(again)).toEqual({ status: 400, error: 'token_invalid' })
    expect(await w.login('a@b.lv', 'jauna-parole-123')).toBeTruthy()
  })

  it('validates the password before spending the token', async () => {
    const w = world()
    await putAccount(w.deps, { email: 'a@b.lv', role: 'admin' })
    const token = await createToken(w.deps, 'a@b.lv', 'reset')
    const res = await call(w.app, 'POST', '/auth/set-password', { body: { token, password: 'short' } })
    expect(errorOf(res)).toEqual({ status: 400, error: 'validation', fields: { password: 'too_short' } })
    expect(w.deps.repo.tokenCount()).toBe(1)
  })

  it('refuses expired, missing and orphaned tokens', async () => {
    const w = world()
    await putAccount(w.deps, { email: 'a@b.lv', role: 'admin' })
    const expired = await createToken(w.deps, 'a@b.lv', 'reset')
    w.deps.setNow('2026-11-25T11:00:01.000Z')
    const body = (token: string) => ({ body: { token, password: 'jauna-parole-123' } })
    expect(errorOf(await call(w.app, 'POST', '/auth/set-password', body(expired))).error).toBe('token_invalid')
    expect(errorOf(await call(w.app, 'POST', '/auth/set-password', body(''))).error).toBe('token_invalid')
    await w.deps.repo.putToken({ hash: hashToken('orphan'), purpose: 'reset', email: 'gone@b.lv', expiresAt: 9e9 })
    expect(errorOf(await call(w.app, 'POST', '/auth/set-password', body('orphan'))).error).toBe('token_invalid')
  })
})

describe('forgot', () => {
  it('emails a 1-hour reset link to the public site for a charity', async () => {
    const w = world()
    await putAccount(w.deps, { email: 'a@b.lv', role: 'charity', charityId: 'c1' })
    expect(data(await call(w.app, 'POST', '/auth/forgot', { body: { email: 'A@b.lv' } }))).toEqual({})
    const [mail] = w.deps.mailer.sent()
    expect(mail?.text).toMatch(/https:\/\/dodarprieku\.hagroup\.lv\/konts\/parole\?token=[\w-]+&reset=1/)
    expect(mail?.html).toContain('&amp;reset=1')
  })

  it('sends admins to the admin host', async () => {
    const w = world()
    await putAccount(w.deps, { email: 'admin@hagroup.lv', role: 'admin' })
    await call(w.app, 'POST', '/auth/forgot', { body: { email: 'admin@hagroup.lv' } })
    expect(w.deps.mailer.sent()[0]?.text).toContain('https://admin.dodarprieku.hagroup.lv/parole?token=')
  })

  it('answers the same for an unknown email, and validates the format', async () => {
    const w = world()
    expect(data(await call(w.app, 'POST', '/auth/forgot', { body: { email: 'nobody@b.lv' } }))).toEqual({})
    expect(w.deps.mailer.sent()).toHaveLength(0)
    expect(errorOf(await call(w.app, 'POST', '/auth/forgot', { body: {} })).fields).toEqual({ email: 'required' })
    expect(errorOf(await call(w.app, 'POST', '/auth/forgot', { body: { email: 'x' } })).fields).toEqual({ email: 'invalid' })
  })

  it('pads both paths to the same minimum time', async () => {
    const w = world()
    await putAccount(w.deps, { email: 'a@b.lv', role: 'charity', charityId: 'c1' })
    await call(w.app, 'POST', '/auth/forgot', { body: { email: 'a@b.lv' } })
    await call(w.app, 'POST', '/auth/forgot', { body: { email: 'nobody@b.lv' } })
    expect(w.deps.sleeps).toHaveLength(2)
    for (const ms of w.deps.sleeps) expect(ms).toBeGreaterThan(FORGOT_FLOOR_MS - 200)
  })
})
