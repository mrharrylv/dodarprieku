/**
 * A fetch stand-in routed by "METHOD /api/path". Each handler returns
 * [status, body] or throws to simulate a network failure. Unrouted calls
 * answer 404 so a missing route fails loudly. Calls are recorded.
 */
import { vi } from 'vitest'

export type Handler = (body: unknown, url: string) => readonly [number, unknown] | Promise<readonly [number, unknown]>
export interface Call {
  readonly method: string
  readonly url: string
  readonly headers: Readonly<Record<string, string>>
  readonly body: unknown
}

export const ok = (data: unknown): readonly [number, unknown] => [200, { ok: true, data }]
export const fail = (status: number, error: string, fields?: Record<string, string>): readonly [number, unknown] => [
  status,
  { ok: false, error, ...(fields ? { fields } : {}) },
]

export const mockFetch = (routes: Record<string, Handler>) => {
  const calls: Call[] = []
  const impl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    calls.push({ method, url, headers: (init?.headers ?? {}) as Record<string, string>, body })
    const path = url.split('?')[0]
    const handler = routes[`${method} ${url}`] ?? routes[`${method} ${path}`]
    const [status, payload] = handler ? await handler(body, url) : [404, { ok: false, error: 'not_found' }]
    return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } })
  })
  return { impl: impl as unknown as typeof fetch, calls }
}
