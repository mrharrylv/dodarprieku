import { ENV, contactMode } from '@/config/env'
import { CONTACT_MOCK_LATENCY_MS, REQUEST_TIMEOUT_MS } from '@/config/constants'
import { normaliseContactForm, type ContactFormValues } from '@/lib/validation'
import type { LocaleCode } from '@/config/site'

/**
 * Submitting the contact form.
 *
 * Every outcome is a VALUE, never a thrown exception, and each one has its own
 * message in the UI. The distinction matters to the person on the other end:
 * "we are not reachable right now, here is our phone number" and "your message
 * was too long" require completely different things of them.
 */

export type ContactResult =
  /** Delivered. */
  | { readonly status: 'sent' }
  /** No endpoint configured: show the phone/email fallback, do not retry. */
  | { readonly status: 'unavailable' }
  /** The endpoint rejected the payload. Field errors, when it said which. */
  | { readonly status: 'invalid'; readonly fields: Record<string, string> }
  /** The endpoint's own rate limit. */
  | { readonly status: 'rate-limited'; readonly retryAfterSeconds: number }
  /** Network failure, timeout, or a 5xx. Retrying may work. */
  | { readonly status: 'error'; readonly reason: 'timeout' | 'network' | 'server' }

interface ErrorBody {
  readonly fields?: Record<string, string>
  readonly retryAfter?: number
}

const parseErrorBody = async (response: Response): Promise<ErrorBody> => {
  try {
    const body: unknown = await response.json()
    if (typeof body !== 'object' || body === null) return {}

    const { fields, retryAfter } = body as ErrorBody
    return {
      ...(typeof fields === 'object' && fields !== null ? { fields } : {}),
      ...(typeof retryAfter === 'number' ? { retryAfter } : {}),
    }
  } catch {
    // A non-JSON error body is normal (a proxy's HTML 502 page). The status
    // code alone is enough to classify the failure.
    return {}
  }
}

/**
 * `Retry-After` in seconds, or `null` when the header is absent or unusable.
 *
 * `Number(null)` is 0, not NaN, so a plain `Number.isFinite` check on a missing
 * header reports a perfectly valid zero-second wait, and the UI then tells the
 * visitor to try again immediately, straight into another 429.
 *
 * The header may also carry an HTTP date rather than a delta; that parses as
 * NaN here and falls through to the caller's default, which is the right
 * outcome for a value we cannot interpret.
 */
const retryAfterHeaderSeconds = (response: Response): number | null => {
  const raw = response.headers.get('Retry-After')
  if (raw === null || raw.trim() === '') return null

  const seconds = Number(raw)
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null
}

/**
 * Demo mode: pretend, after a pause long enough to see the pending state.
 *
 * The pause is the point. Resolving instantly hides the "Sending" button and
 * the disabled fieldset, which are exactly the states a demo is meant to show.
 * The payload is logged so a reviewer can see what would have been sent.
 */
const simulateSubmission = async (values: ContactFormValues): Promise<ContactResult> => {
  console.warn('[contact] mock mode: this message was NOT delivered', normaliseContactForm(values))
  await new Promise((resolve) => setTimeout(resolve, CONTACT_MOCK_LATENCY_MS))
  return { status: 'sent' }
}

/**
 * Send the form.
 *
 * The caller must have validated already; this validates nothing and trusts
 * the endpoint to be the real authority.
 */
export const submitContactForm = async (
  values: ContactFormValues,
  locale: LocaleCode,
): Promise<ContactResult> => {
  const mode = contactMode()
  if (mode === 'off') return { status: 'unavailable' }
  if (mode === 'mock') return simulateSubmission(values)

  const endpoint = ENV.contactEndpoint
  if (endpoint === null) return { status: 'unavailable' }

  const payload = normaliseContactForm(values)

  // `fetch` has no default timeout. Without this an unreachable backend leaves
  // the button on "Sending…" forever, showing neither success nor error.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        subject: payload.subject,
        message: payload.message,
        consent: payload.consent,
        locale,
      }),
      signal: controller.signal,
    })

    if (response.ok) return { status: 'sent' }

    if (response.status === 429) {
      const { retryAfter } = await parseErrorBody(response)
      return {
        status: 'rate-limited',
        retryAfterSeconds: retryAfter ?? retryAfterHeaderSeconds(response) ?? 60,
      }
    }

    if (response.status >= 400 && response.status < 500) {
      const { fields } = await parseErrorBody(response)
      return { status: 'invalid', fields: fields ?? {} }
    }

    return { status: 'error', reason: 'server' }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { status: 'error', reason: 'timeout' }
    }
    // Log the detail for whoever debugs this; show the visitor a sentence they
    // can act on. Never surface the raw error to the page.
    console.error('[contact] submission failed', error)
    return { status: 'error', reason: 'network' }
  } finally {
    clearTimeout(timer)
  }
}
