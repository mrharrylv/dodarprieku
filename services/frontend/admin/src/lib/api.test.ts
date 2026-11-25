import { describe, expect, it, vi } from 'vitest'
import { CSRF_HEADER, CSRF_VALUE } from '@shared/contracts'
import { fail, mockFetch, ok } from '../test/fetch'
import { ApiError, codeForStatus, createClient, endpoints, interpret, isApiError } from './api'

describe('codeForStatus', () => {
  it.each([
    [400, 'bad_request'], [401, 'unauthorized'], [403, 'forbidden'], [404, 'not_found'], [409, 'conflict'],
    [413, 'too_large'], [429, 'rate_limited'], [500, 'server'], [502, 'server'], [418, 'server'],
  ] as const)('%i -> %s', (status, code) => {
    expect(codeForStatus(status)).toBe(code)
  })
})

describe('interpret', () => {
  it('returns data from a success envelope', () => {
    expect(interpret(200, { ok: true, data: { a: 1 } })).toEqual({ a: 1 })
  })
  it('throws the envelope code with string fields only', () => {
    const error = (() => {
      try {
        interpret(400, { ok: false, error: 'validation', fields: { email: 'invalid', n: 3 } })
      } catch (e) {
        return e
      }
    })()
    expect(isApiError(error)).toBe(true)
    expect(error).toMatchObject({ code: 'validation', status: 400, fields: { email: 'invalid' } })
  })
  it('maps a non-envelope body by status, and a 2xx garbage body to server', () => {
    expect(() => interpret(502, undefined)).toThrow(expect.objectContaining({ code: 'server' }))
    expect(() => interpret(429, '<html>')).toThrow(expect.objectContaining({ code: 'rate_limited' }))
    expect(() => interpret(200, { hello: 1 })).toThrow(expect.objectContaining({ code: 'server' }))
    expect(() => interpret(404, { ok: false, error: 'weird' })).toThrow(expect.objectContaining({ code: 'not_found' }))
    expect(() => interpret(500, { ok: true, data: 1 })).toThrow(expect.objectContaining({ code: 'server' }))
  })
})

describe('client', () => {
  it('sends the CSRF header and JSON body on mutations only', async () => {
    const f = mockFetch({
      'GET /api/admin/charities': () => ok([]),
      'POST /api/admin/charities/a%2Fb/reject': () => ok({}),
    })
    const api = endpoints(createClient({ fetchImpl: f.impl }))
    await api.charities()
    await api.reject('a/b', 'Nepilnīgs')
    expect(f.calls[0]?.headers[CSRF_HEADER]).toBeUndefined()
    expect(f.calls[1]?.headers[CSRF_HEADER]).toBe(CSRF_VALUE)
    expect(f.calls[1]?.headers['content-type']).toBe('application/json')
    expect(f.calls[1]?.body).toEqual({ reason: 'Nepilnīgs' })
  })

  it('builds query strings and leaves empty params out', async () => {
    const f = mockFetch({
      'GET /api/admin/charities': () => ok([]),
      'GET /api/admin/pledges': () => ok([]),
    })
    const api = endpoints(createClient({ fetchImpl: f.impl }))
    await api.charities('pending')
    await api.pledges()
    await api.pledges('c 1')
    expect(f.calls.map((c) => c.url)).toEqual([
      '/api/admin/charities?status=pending', '/api/admin/pledges', '/api/admin/pledges?charityId=c+1',
    ])
  })

  it('calls every endpoint at its contract path', async () => {
    const f = mockFetch({})
    const api = endpoints(createClient({ fetchImpl: f.impl }))
    const run = [
      () => api.me(), () => api.login({ email: 'a', password: 'b' }), () => api.logout(),
      () => api.setPassword({ token: 't', password: 'p' }), () => api.charity('x'),
      () => api.saveProfile('x', {} as never), () => api.approve('x'), () => api.reject('x'), () => api.suspend('x', 'r'),
      () => api.suspend('x'), () => api.restore('x'), () => api.resendInvite('x'), () => api.approveUpdate('x'),
      () => api.rejectUpdate('x', 'r'), () => api.rejectUpdate('x'), () => api.remove('x'), () => api.subscribers(),
      () => api.listRequests(), () => api.listRequestDone('c', 'r'),
      () => api.upload({ kind: 'photo', contentType: 'image/png', dataBase64: 'AA==' }),
    ]
    for (const call of run) await call().catch((e: unknown) => expect(isApiError(e)).toBe(true))
    expect(f.calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'GET /api/auth/me', 'POST /api/auth/login', 'POST /api/auth/logout', 'POST /api/auth/set-password',
      'GET /api/admin/charities/x', 'PUT /api/admin/charities/x/profile', 'POST /api/admin/charities/x/approve',
      'POST /api/admin/charities/x/reject', 'POST /api/admin/charities/x/suspend', 'POST /api/admin/charities/x/suspend',
      'POST /api/admin/charities/x/restore', 'POST /api/admin/charities/x/resend-invite',
      'POST /api/admin/charities/x/update/approve', 'POST /api/admin/charities/x/update/reject',
      'POST /api/admin/charities/x/update/reject', 'DELETE /api/admin/charities/x', 'GET /api/admin/subscribers',
      'GET /api/admin/list-requests', 'POST /api/admin/list-requests/c/r/done', 'POST /api/uploads',
    ])
    expect(f.calls[7]?.body).toEqual({})
  })

  it('maps a rejected fetch to network and an abort to timeout', async () => {
    const network = createClient({ fetchImpl: (() => Promise.reject(new TypeError('Failed'))) as typeof fetch })
    await expect(network.request('GET', '/x')).rejects.toMatchObject({ code: 'network', status: 0 })

    const hanging = ((_: unknown, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      })) as typeof fetch
    const slow = createClient({ fetchImpl: hanging, timeoutMs: 5 })
    await expect(slow.request('GET', '/x')).rejects.toMatchObject({ code: 'timeout' })
  })

  it('maps a non-JSON error page by status', async () => {
    const html = (() => Promise.resolve(new Response('<h1>Bad gateway</h1>', { status: 502 }))) as typeof fetch
    await expect(createClient({ fetchImpl: html }).request('GET', '/x')).rejects.toMatchObject({ code: 'server', status: 502 })
  })

  it('reports an expired session on a 401, except from the session probes', async () => {
    const onUnauthorized = vi.fn()
    const f = mockFetch({
      'GET /api/admin/subscribers': () => fail(401, 'unauthorized'),
      'GET /api/auth/me': () => fail(401, 'unauthorized'),
      'POST /api/auth/login': () => fail(401, 'unauthorized'),
      'GET /api/admin/charities': () => fail(403, 'forbidden'),
    })
    const client = createClient({ fetchImpl: f.impl, onUnauthorized })
    const api = endpoints(client)
    await expect(api.me()).rejects.toBeInstanceOf(ApiError)
    await expect(api.login({ email: 'a', password: 'b' })).rejects.toMatchObject({ code: 'unauthorized' })
    await expect(api.charities()).rejects.toMatchObject({ code: 'forbidden' })
    expect(onUnauthorized).not.toHaveBeenCalled()
    await expect(api.subscribers()).rejects.toMatchObject({ code: 'unauthorized' })
    expect(onUnauthorized).toHaveBeenCalledTimes(1)

    client.setUnauthorizedHandler(undefined)
    await expect(api.subscribers()).rejects.toMatchObject({ code: 'unauthorized' })
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })
})
