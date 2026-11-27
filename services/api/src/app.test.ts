import { describe, expect, it } from 'vitest'
import { createApp, DEFAULT_MAX_BODY } from './app'
import { route } from './http/router'
import type { RouteDef } from './http/context'
import { ApiError } from './http/errors'
import { call, createTestDeps, errorOf, ORIGIN_VERIFY_HEADER, ORIGIN_VERIFY_SECRET, testConfig, world } from './test/helpers'

describe('app pipeline', () => {
  it('answers 404 for unknown paths and wrong methods', async () => {
    const w = world()
    expect(errorOf(await call(w.app, 'GET', '/nope'))).toEqual({ status: 404, error: 'not_found' })
    expect(errorOf(await call(w.app, 'DELETE', '/subscribe')).status).toBe(404)
  })

  it('refuses, before routing, a request that did not come through CloudFront', async () => {
    const w = world()
    const direct = await call(w.app, 'POST', '/auth/login', { originVerify: false, body: { email: 'a@b.lv', password: 'x' } })
    expect(errorOf(direct)).toEqual({ status: 403, error: 'forbidden' })
    expect(errorOf(await call(w.app, 'GET', '/nope', { originVerify: false }))).toEqual({ status: 403, error: 'forbidden' })
    const forged = await call(w.app, 'GET', '/auth/me', { originVerify: false, headers: { [ORIGIN_VERIFY_HEADER]: 'guess' } })
    expect(errorOf(forged)).toEqual({ status: 403, error: 'forbidden' })
    const same = await call(w.app, 'GET', '/nope', { originVerify: false, headers: { [ORIGIN_VERIFY_HEADER]: `${ORIGIN_VERIFY_SECRET}x` } })
    expect(errorOf(same).status).toBe(403)
    expect(errorOf(await call(w.app, 'GET', '/nope')).status).toBe(404)
    expect(w.deps.mailer.sent()).toEqual([])
  })

  it('needs no origin-verify header locally, where no secret is configured', async () => {
    const deps = { ...createTestDeps(), config: testConfig({ ENVIRONMENT: 'local', ORIGIN_VERIFY_HEADER: '', ORIGIN_VERIFY_SECRET: '' }) }
    expect(errorOf(await call(createApp(deps), 'GET', '/nope', { originVerify: false })).status).toBe(404)
  })

  it('requires the CSRF header on mutations', async () => {
    const w = world()
    expect(errorOf(await call(w.app, 'POST', '/auth/logout', { csrf: false }))).toEqual({ status: 403, error: 'forbidden' })
    expect((await call(w.app, 'POST', '/auth/logout')).status).toBe(200)
  })

  it('refuses a foreign Origin, allows ours and (locally) localhost', async () => {
    const w = world()
    const post = (origin: string) => call(w.app, 'POST', '/auth/logout', { headers: { origin } })
    expect((await post('https://evil.example')).status).toBe(403)
    expect((await post('https://dodarprieku.hagroup.lv')).status).toBe(200)
    expect((await post('https://admin.dodarprieku.hagroup.lv')).status).toBe(200)
    expect((await post('http://localhost:5173')).status).toBe(403)
    const local = world({ local: true })
    expect((await call(local.app, 'POST', '/auth/logout', { headers: { origin: 'http://localhost:5173' } })).status).toBe(200)
  })

  it('refuses oversized bodies and malformed JSON', async () => {
    const w = world()
    const big = await call(w.app, 'POST', '/subscribe', { rawBody: 'x'.repeat(DEFAULT_MAX_BODY + 1) })
    expect(errorOf(big)).toEqual({ status: 413, error: 'too_large' })
    expect(errorOf(await call(w.app, 'POST', '/subscribe', { rawBody: '{nope' }))).toEqual({ status: 400, error: 'bad_request' })
    expect(errorOf(await call(w.app, 'POST', '/subscribe', { rawBody: '[]' }))).toEqual({ status: 400, error: 'bad_request' })
  })

  it('turns an unexpected error into a bare 500 and logs it with the request id', async () => {
    const deps = createTestDeps()
    const boom: RouteDef = { handle: async () => { throw new Error('secret internals') } }
    const typed: RouteDef = { handle: async () => { throw new ApiError('conflict') } }
    const status: RouteDef = { handle: async () => ({ data: 1, status: 201 }) }
    const app = createApp(deps, [route('GET /boom', boom), route('GET /typed', typed), route('GET /created', status)])
    const res = await call(app, 'GET', '/boom')
    expect(res).toEqual({ status: 500, body: { ok: false, error: 'server' } })
    const line = deps.logs.find((l) => l.includes('unhandled error'))
    expect(JSON.parse(line!)).toMatchObject({ level: 'error', requestId: 'req-test', errorMessage: 'secret internals' })
    expect(errorOf(await call(app, 'GET', '/typed')).status).toBe(409)
    expect(await call(app, 'GET', '/created')).toEqual({ status: 201, body: { ok: true, data: 1 } })
  })
})
