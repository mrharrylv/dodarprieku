/**
 * Fire-and-forget delivery of one visit report.
 *
 * Statistics are the one thing on the site allowed to fail without telling
 * anyone: a visitor cannot act on "your page view was not counted", and the
 * page must behave exactly the same whether the CRM is up, down, slow or
 * blocked by an extension. So this never throws, never awaits, never retries
 * and never shows anything.
 *
 * The body is JSON sent as `text/plain`. That keeps it a CORS "simple
 * request": no preflight, so one report is one request, and `sendBeacon`
 * accepts it (Chrome refuses a beacon with a JSON content type). The CRM
 * parses the body as JSON whatever the header says (doc/visit-tracking.md).
 */

import type { TrackPayload } from './analytics'

export type Transport = (endpoint: string, payload: TrackPayload) => boolean

/** Returns whether the report was handed to the browser, which is all anyone can know. */
export const sendReport: Transport = (endpoint, payload) => {
  const body = JSON.stringify(payload)

  try {
    // Queued by the browser and delivered even while the page unloads.
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      if (navigator.sendBeacon(endpoint, body)) return true
    }
  } catch {
    // A browser that throws here (an old WebView, a hostile extension) falls
    // through to fetch below; the report is optional either way.
  }

  try {
    if (typeof fetch !== 'function') return false
    fetch(endpoint, {
      method: 'POST',
      body,
      keepalive: true,
      mode: 'no-cors',
      credentials: 'omit',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    }).catch(() => {
      // The CRM is down or unreachable. By design nothing happens: see the
      // comment at the top of this file.
      return undefined
    })
    return true
  } catch {
    // fetch itself threw synchronously (a CSP that blocks the origin, in some
    // browsers). Same answer: the page carries on without the report.
    return false
  }
}
