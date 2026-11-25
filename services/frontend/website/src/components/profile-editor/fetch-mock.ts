/**
 * A fake `fetch` for the registration and account tests: each handler is
 * keyed "METHOD /path" and returns [status, body]. An unknown request fails
 * the test loudly instead of hanging. Not imported by any page.
 */

import { vi } from 'vitest'

export type Reply = readonly [number, unknown] | 'network'
export type Handler = (body: unknown) => Reply

export const ok = (data: unknown): Reply => [200, { ok: true, data }]
export const fail = (status: number, error: string, fields?: Record<string, string>): Reply => [
  status,
  { ok: false, error, ...(fields ? { fields } : {}) },
]

export const mockApi = (handlers: Record<string, Handler | Reply>) => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const path = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0] ?? url
    const key = `${init?.method ?? 'GET'} ${path}`
    const handler = handlers[key]
    if (handler === undefined) throw new Error(`Unexpected request in test: ${key}`)
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    const reply = typeof handler === 'function' ? handler(body) : handler
    if (reply === 'network') throw new TypeError('Failed to fetch')
    return new Response(JSON.stringify(reply[1]), { status: reply[0], headers: { 'content-type': 'application/json' } })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

