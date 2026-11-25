import { describe, expect, it, vi } from 'vitest'

import { CSRF_HEADER, SNAPSHOT_PATH, type PledgeRequest } from '@shared/contracts'
import { EMPTY_SNAPSHOT } from './snapshot'
import { fakeFetch, snapshotFixture } from './snapshot.fixtures'
import { failureFrom, fetchSnapshot, fetchStats, isCharityStats, postPledge, postSubscribe, postView, request } from './public-api'

const stats = { views: 3, pledges: 2, pledgesByNeed: { smiltis: 2 }, recentSupporters: [{ name: 'Anna', at: '2026-11-20' }] }
const pledge: PledgeRequest = { needs: ['smiltis'], anonymous: true, subscribe: false, consent: false }

describe('failure classification', () => {
  it.each([
    [429, {}, { kind: 'rate_limited' }],
    [400, { ok: false, error: 'rate_limited' }, { kind: 'rate_limited' }],
    [400, { ok: false, error: 'validation', fields: { email: 'invalid' } }, { kind: 'validation', fields: { email: 'invalid' } }],
    [400, { ok: false, error: 'validation' }, { kind: 'validation', fields: {} }],
    [400, { ok: false, error: 'bad_request' }, { kind: 'validation', fields: {} }],
    [404, undefined, { kind: 'not_found' }],
    [500, { ok: false, error: 'server' }, { kind: 'server' }],
    [502, undefined, { kind: 'server' }],
    [403, { ok: false, error: 'forbidden' }, { kind: 'server' }],
  ])('%i %j', (status, body, expected) => {
    expect(failureFrom(status, body)).toEqual(expected)
  })
})

describe('request', () => {
  it('reports a network failure', async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    expect(await request('/api/x', { fetcher })).toEqual({ ok: false, error: { kind: 'network' } })
  })

  it('gives up after the timeout', async () => {
    const fetcher = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        }),
    ) as unknown as typeof fetch
    expect(await request('/api/x', { fetcher, timeoutMs: 5 })).toEqual({ ok: false, error: { kind: 'timeout' } })
  })

  it('treats a non-JSON error page as its status', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('<html>', { status: 503 }))
    expect(await request('/api/x', { fetcher })).toEqual({ ok: false, error: { kind: 'server' } })
  })

  it('sends the CSRF header and JSON body on a POST, not on a GET', async () => {
    const fetcher = fakeFetch({ '/api/charities/c%201/pledges': { body: { ok: true, data: { id: 'p1' } } } })
    expect(await postPledge('c 1', pledge, fetcher)).toEqual({ ok: true, data: { id: 'p1' } })
    const init = fetcher.mock.calls[0]?.[1]
    expect(init?.method).toBe('POST')
    expect((init?.headers as Record<string, string>)[CSRF_HEADER]).toBe('1')
    expect(JSON.parse(String(init?.body))).toEqual(pledge)

    const get = fakeFetch({ '/api/charities/c1/stats': { body: { ok: true, data: stats } } })
    await fetchStats('c1', get)
    expect((get.mock.calls[0]?.[1]?.headers as Record<string, string>)[CSRF_HEADER]).toBeUndefined()
  })
})

describe('endpoints', () => {
  it('loads and validates the snapshot', async () => {
    expect(await fetchSnapshot(fakeFetch({ [SNAPSHOT_PATH]: { body: snapshotFixture } }))).toEqual({ ok: true, data: snapshotFixture })
  })

  it('reads a missing snapshot as an empty map', async () => {
    expect(await fetchSnapshot(fakeFetch({}))).toEqual({ ok: true, data: EMPTY_SNAPSHOT })
  })

  it.each([403, 404])('reads a %i on the snapshot file as an empty map', async (status) => {
    const fetcher = fakeFetch({ [SNAPSHOT_PATH]: { status, body: undefined } })
    expect(await fetchSnapshot(fetcher)).toEqual({ ok: true, data: EMPTY_SNAPSHOT })
  })

  it('keeps a 403 on other endpoints as a failure', async () => {
    const fetcher = fakeFetch({ '/api/charities/c1/stats': { status: 403, body: { ok: false, error: 'forbidden' } } })
    expect(await fetchStats('c1', fetcher)).toEqual({ ok: false, error: { kind: 'server' } })
  })

  it('refuses a snapshot of the wrong shape, and passes other failures on', async () => {
    expect(await fetchSnapshot(fakeFetch({ [SNAPSHOT_PATH]: { body: { nope: 1 } } }))).toEqual({ ok: false, error: { kind: 'server' } })
    expect(await fetchSnapshot(fakeFetch({ [SNAPSHOT_PATH]: { status: 500, body: {} } }))).toEqual({ ok: false, error: { kind: 'server' } })
  })

  it('checks the stats it gets', async () => {
    expect(isCharityStats(stats)).toBe(true)
    expect(isCharityStats({ ...stats, pledgesByNeed: { a: 'x' } })).toBe(false)
    expect(isCharityStats({ ...stats, recentSupporters: [{ name: 1 }] })).toBe(false)
    expect(await fetchStats('c1', fakeFetch({ '/api/charities/c1/stats': { body: { ok: true, data: { views: 1 } } } }))).toEqual({
      ok: false,
      error: { kind: 'server' },
    })
    expect(await fetchStats('c1', fakeFetch({ '/api/charities/c1/stats': { body: { ok: false, error: 'server' } } }))).toEqual({
      ok: false,
      error: { kind: 'server' },
    })
  })

  it('posts a view and a subscription', async () => {
    expect(await postView('c1', fakeFetch({ '/api/charities/c1/view': { body: { ok: true, data: {} } } }))).toEqual({ ok: true, data: {} })
    const fetcher = fakeFetch({ '/api/subscribe': { status: 429, body: { ok: false, error: 'rate_limited' } } })
    expect(await postSubscribe({ email: 'a@b.lv', consent: true }, fetcher)).toEqual({ ok: false, error: { kind: 'rate_limited' } })
  })
})
