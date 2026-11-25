import { afterEach, describe, expect, it, vi } from 'vitest'

import type { TrackPayload } from './analytics'
import { sendReport } from './beacon'

const payload = { v: 1, type: 'engagement', pid: 'p' } as unknown as TrackPayload
const endpoint = 'https://crm.hagroup.lv/api/track'

const stubBeacon = (impl: (...args: unknown[]) => boolean) => {
  const beacon = vi.fn(impl)
  Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: beacon })
  return beacon
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'sendBeacon')
})

describe('sendReport', () => {
  it('queues the JSON with sendBeacon, as text/plain so there is no preflight', () => {
    const beacon = stubBeacon(() => true)
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    expect(sendReport(endpoint, payload)).toBe(true)
    expect(beacon).toHaveBeenCalledWith(endpoint, JSON.stringify(payload))
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('falls back to a keepalive fetch with no cookies when the beacon is refused', () => {
    stubBeacon(() => false)
    const fetchSpy = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })))
    vi.stubGlobal('fetch', fetchSpy)
    expect(sendReport(endpoint, payload)).toBe(true)
    expect(fetchSpy).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({ method: 'POST', keepalive: true, mode: 'no-cors', credentials: 'omit' }),
    )
  })

  it('stays silent when the CRM is down', async () => {
    stubBeacon(() => {
      throw new Error('blocked')
    })
    const rejected = Promise.reject(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', vi.fn(() => rejected))
    expect(sendReport(endpoint, payload)).toBe(true)
    await expect(rejected).rejects.toThrow()
  })

  it('returns false, never throws, when there is no way to send', () => {
    vi.stubGlobal('fetch', vi.fn(() => {
      throw new TypeError('Refused by CSP')
    }))
    expect(sendReport(endpoint, payload)).toBe(false)
    vi.stubGlobal('fetch', undefined)
    expect(sendReport(endpoint, payload)).toBe(false)
  })
})
