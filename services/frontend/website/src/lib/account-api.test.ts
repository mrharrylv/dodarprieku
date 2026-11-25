import { afterEach, describe, expect, it, vi } from 'vitest'

import { CSRF_HEADER, CSRF_VALUE } from '@shared/contracts'

import { fail, mockApi, ok } from '@/components/profile-editor/fetch-mock'
import {
  API_PATHS,
  apiRequest,
  fetchMe,
  interpretBody,
  login,
  requestSubscriberList,
  submitApplication,
} from './account-api'

describe('interpretBody', () => {
  it('passes data through', () => {
    expect(interpretBody(200, { ok: true, data: { a: 1 } })).toEqual({ ok: true, data: { a: 1 } })
  })

  it('keeps a known error code and its fields', () => {
    expect(interpretBody(400, { ok: false, error: 'validation', fields: { a: 'required' } })).toEqual({
      ok: false, error: 'validation', status: 400, fields: { a: 'required' },
    })
  })

  it('drops malformed fields', () => {
    expect(interpretBody(400, { ok: false, error: 'validation', fields: { a: 1 } })).toEqual({ ok: false, error: 'validation', status: 400 })
  })

  it('maps an unknown code by status', () => {
    expect(interpretBody(429, { ok: false, error: 'weird' })).toMatchObject({ error: 'rate_limited' })
  })

  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [413, 'too_large'],
    [429, 'rate_limited'],
    [502, 'server'],
    [200, 'invalid_response'],
  ])('maps a body that is not the envelope, status %i, to %s', (status, error) => {
    expect(interpretBody(status, '<html>')).toEqual({ ok: false, error, status })
  })
})

describe('apiRequest', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('sends the CSRF header and JSON body on a POST', async () => {
    const fetchMock = mockApi({ 'POST /api/auth/login': ok({ email: 'a@b.lv', role: 'charity' }) })
    const result = await login('a@b.lv', 'secret')
    expect(result).toEqual({ ok: true, data: { email: 'a@b.lv', role: 'charity' } })
    const init = fetchMock.mock.calls[0]?.[1]
    expect(init?.headers).toMatchObject({ [CSRF_HEADER]: CSRF_VALUE, 'content-type': 'application/json' })
    expect(init?.credentials).toBe('same-origin')
    expect(JSON.parse(String(init?.body))).toEqual({ email: 'a@b.lv', password: 'secret' })
  })

  it('sends no CSRF header and no body on a GET', async () => {
    const fetchMock = mockApi({ 'GET /api/auth/me': fail(401, 'unauthorized') })
    expect(await fetchMe()).toEqual({ ok: false, error: 'unauthorized', status: 401 })
    const init = fetchMock.mock.calls[0]?.[1]
    expect(init?.headers).not.toHaveProperty(CSRF_HEADER)
    expect(init?.body).toBeUndefined()
  })

  it('reports a lost connection as network', async () => {
    mockApi({ 'POST /api/applications': 'network' })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(await submitApplication({} as never)).toEqual({ ok: false, error: 'network', status: 0 })
  })

  it('reports a body that is not JSON by its status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('oops', { status: 500 })))
    expect(await apiRequest('GET', API_PATHS.account)).toEqual({ ok: false, error: 'server', status: 500 })
  })

  it('gives up after the timeout', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    })))
    const pending = apiRequest('GET', API_PATHS.account, undefined, 1000)
    await vi.advanceTimersByTimeAsync(1000)
    expect(await pending).toEqual({ ok: false, error: 'timeout', status: 0 })
  })

  it('leaves out an empty list-request message', async () => {
    const fetchMock = mockApi({ 'POST /api/account/list-request': ok({ id: 'r1' }) })
    await requestSubscriberList('   ')
    await requestSubscriberList(' Lūdzu ')
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({})
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ message: 'Lūdzu' })
  })
})
