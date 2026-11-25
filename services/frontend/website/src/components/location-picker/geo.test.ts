import { afterEach, describe, expect, it, vi } from 'vitest'

import { firstResult, geocode, inLatvia, roundCoord, searchUrl } from './geo'

const reply = (status: number, body: unknown) =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })))

describe('geo', () => {
  afterEach(() => vi.useRealTimers())

  it('builds a Nominatim search limited to Latvia and one result', () => {
    const url = new URL(searchUrl(' Brīvības iela 1, Rīga '))
    expect(url.origin).toBe('https://nominatim.openstreetmap.org')
    expect(Object.fromEntries(url.searchParams)).toEqual({ format: 'json', countrycodes: 'lv', limit: '1', q: 'Brīvības iela 1, Rīga' })
  })

  it('reads the first result, and nothing from a malformed one', () => {
    expect(firstResult([{ lat: '56.9496487', lon: '24.1051865' }, { lat: '1', lon: '1' }])).toEqual({ lat: 56.949649, lng: 24.105187 })
    expect(firstResult([])).toBeNull()
    expect(firstResult({})).toBeNull()
    expect(firstResult([{ lat: 'x', lon: '1' }])).toBeNull()
    expect(firstResult([null])).toBeNull()
  })

  it('knows where Latvia is', () => {
    expect(inLatvia({ lat: 56.9, lng: 24.1 })).toBe(true)
    expect(inLatvia({ lat: 54.6, lng: 25.2 })).toBe(false)
    expect(roundCoord(1.23456789)).toBe(1.234568)
  })

  it('does not search for nothing', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await geocode('  ')).toEqual({ ok: false, error: 'empty' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('finds a point', async () => {
    reply(200, [{ lat: '56.95', lon: '24.1' }])
    expect(await geocode('Rīga')).toEqual({ ok: true, point: { lat: 56.95, lng: 24.1 } })
  })

  it.each([
    [200, [], 'not_found'],
    [200, [{ lat: '40', lon: '10' }], 'outside'],
    [503, {}, 'server'],
  ])('answers status %i %j with %s', async (status, body, error) => {
    reply(status, body)
    expect(await geocode('x')).toEqual({ ok: false, error })
  })

  it('reports a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(await geocode('x')).toEqual({ ok: false, error: 'network' })
  })

  it('times out', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn((_u: string, init: RequestInit) => new Promise((_r, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    })))
    const pending = geocode('x')
    await vi.advanceTimersByTimeAsync(20_000)
    expect(await pending).toEqual({ ok: false, error: 'timeout' })
  })
})
