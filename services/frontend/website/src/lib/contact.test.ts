import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import type { ContactFormValues } from './validation'

const values: ContactFormValues = {
  name: 'Jane',
  email: 'jane@example.com',
  phone: '',
  subject: 'Hello',
  message: 'I would like to know more.',
  consent: true,
}

/**
 * `config/env` reads `import.meta.env` once, at module load. Each test therefore
 * re-imports both modules with the environment it needs, rather than trying to
 * mutate a frozen value after the fact.
 */
const loadWith = async (env: { endpoint?: string; mode?: string }) => {
  vi.resetModules()
  vi.stubEnv('VITE_CONTACT_ENDPOINT', env.endpoint ?? '')
  vi.stubEnv('VITE_CONTACT_MODE', env.mode ?? '')
  return import('./contact')
}

const loadWithEndpoint = async (endpoint: string | undefined) =>
  loadWith({ ...(endpoint === undefined ? {} : { endpoint }) })

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

const ENDPOINT = 'https://api.example.com/contact'

const respond = (init: ResponseInit & { body?: unknown }) => {
  const { body, ...rest } = init
  return vi.fn().mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json' },
      ...rest,
    }),
  )
}

describe('contact mode', () => {
  it('defaults to mock: resolves "sent" after the demo latency, sending nothing', async () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { submitContactForm } = await loadWithEndpoint(undefined)
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const pending = submitContactForm(values, 'en')
    // The pause is deliberate: it is what makes the pending state visible.
    await vi.advanceTimersByTimeAsync(699)
    let settled = false
    void pending.then(() => {
      settled = true
    })
    await Promise.resolve()
    expect(settled).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    expect(await pending).toEqual({ status: 'sent' })
    expect(fetchSpy).not.toHaveBeenCalled()
    // Says so in the console, so a reviewer knows nothing left the browser.
    expect(console.warn).toHaveBeenCalledWith(expect.stringMatching(/NOT delivered/), expect.anything())
    vi.useRealTimers()
  })

  it('"off" reports "unavailable" without attempting a request', async () => {
    const { submitContactForm } = await loadWith({ mode: 'off' })
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    expect(await submitContactForm(values, 'en')).toEqual({ status: 'unavailable' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('"off" wins even when an endpoint is configured', async () => {
    const { submitContactForm } = await loadWith({ endpoint: ENDPOINT, mode: 'off' })
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    expect(await submitContactForm(values, 'en')).toEqual({ status: 'unavailable' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('"live" without an endpoint is off, and says why once', async () => {
    const { submitContactForm } = await loadWith({ mode: 'live' })

    expect(await submitContactForm(values, 'en')).toEqual({ status: 'unavailable' })
    expect(console.error).toHaveBeenCalledWith(expect.stringMatching(/VITE_CONTACT_ENDPOINT is not set/))
  })

  it('a valid endpoint wins over "mock": the real request is made', async () => {
    const { submitContactForm } = await loadWith({ endpoint: ENDPOINT, mode: 'mock' })
    const fetchSpy = respond({ status: 200 })
    vi.stubGlobal('fetch', fetchSpy)

    expect(await submitContactForm(values, 'en')).toEqual({ status: 'sent' })
    expect(fetchSpy).toHaveBeenCalledOnce()
  })

  it('an unrecognised mode falls back to mock and complains', async () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { submitContactForm } = await loadWith({ mode: 'sometimes' })

    const pending = submitContactForm(values, 'en')
    await vi.advanceTimersByTimeAsync(700)
    expect(await pending).toEqual({ status: 'sent' })
    expect(console.error).toHaveBeenCalledWith(expect.stringMatching(/VITE_CONTACT_MODE/))
    vi.useRealTimers()
  })
})

describe('when the endpoint is not https', () => {
  it('treats it as unconfigured rather than sending in the clear', async () => {
    const { submitContactForm } = await loadWithEndpoint('http://api.example.com/contact')
    const result = await submitContactForm(values, 'en')
    expect(result).toEqual({ status: 'unavailable' })
  })
})

describe('when the endpoint is malformed', () => {
  it('treats it as unconfigured', async () => {
    const { submitContactForm } = await loadWithEndpoint('not a url')
    const result = await submitContactForm(values, 'en')
    expect(result).toEqual({ status: 'unavailable' })
  })
})

describe('a successful submission', () => {
  it('reports "sent"', async () => {
    const { submitContactForm } = await loadWithEndpoint(ENDPOINT)
    vi.stubGlobal('fetch', respond({ status: 200 }))

    expect(await submitContactForm(values, 'en')).toEqual({ status: 'sent' })
  })

  it('sends normalised values and the locale', async () => {
    const { submitContactForm } = await loadWithEndpoint(ENDPOINT)
    const fetchSpy = respond({ status: 200 })
    vi.stubGlobal('fetch', fetchSpy)

    await submitContactForm({ ...values, email: '  Jane@Example.COM ' }, 'lv')

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(String(init.body)) as Record<string, unknown>

    expect(body.email).toBe('jane@example.com')
    expect(body.locale).toBe('lv')
    expect(body.consent).toBe(true)
  })
})

describe('failure modes', () => {
  it('maps 429 to rate-limited, reading Retry-After', async () => {
    const { submitContactForm } = await loadWithEndpoint(ENDPOINT)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{}', { status: 429, headers: { 'Retry-After': '120' } }),
      ),
    )

    const result = await submitContactForm(values, 'en')
    expect(result).toEqual({ status: 'rate-limited', retryAfterSeconds: 120 })
  })

  it('falls back to 60 seconds when the server gives no hint', async () => {
    const { submitContactForm } = await loadWithEndpoint(ENDPOINT)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 429 })))

    const result = await submitContactForm(values, 'en')
    expect(result).toEqual({ status: 'rate-limited', retryAfterSeconds: 60 })
  })

  it('maps 400 to invalid and surfaces the field errors', async () => {
    const { submitContactForm } = await loadWithEndpoint(ENDPOINT)
    vi.stubGlobal(
      'fetch',
      respond({ status: 400, body: { fields: { email: 'errors.email.invalid' } } }),
    )

    const result = await submitContactForm(values, 'en')
    expect(result).toEqual({
      status: 'invalid',
      fields: { email: 'errors.email.invalid' },
    })
  })

  it('handles a 4xx whose body is not JSON', async () => {
    const { submitContactForm } = await loadWithEndpoint(ENDPOINT)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>Bad Request</html>', { status: 422 })),
    )

    // A proxy's HTML error page must not crash the handler.
    expect(await submitContactForm(values, 'en')).toEqual({ status: 'invalid', fields: {} })
  })

  it('maps 5xx to a server error', async () => {
    const { submitContactForm } = await loadWithEndpoint(ENDPOINT)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 502 })))

    expect(await submitContactForm(values, 'en')).toEqual({
      status: 'error',
      reason: 'server',
    })
  })

  it('maps an abort to a timeout', async () => {
    const { submitContactForm } = await loadWithEndpoint(ENDPOINT)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')),
    )

    // Without the AbortController this case never resolves at all, and the
    // button stays on "Sending…" forever.
    expect(await submitContactForm(values, 'en')).toEqual({
      status: 'error',
      reason: 'timeout',
    })
  })

  it('maps a network failure to a network error', async () => {
    const { submitContactForm } = await loadWithEndpoint(ENDPOINT)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    expect(await submitContactForm(values, 'en')).toEqual({
      status: 'error',
      reason: 'network',
    })
  })

  it('never throws, whatever the endpoint does', async () => {
    const { submitContactForm } = await loadWithEndpoint(ENDPOINT)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('a bare string, not an Error'))

    await expect(submitContactForm(values, 'en')).resolves.toBeDefined()
  })
})
