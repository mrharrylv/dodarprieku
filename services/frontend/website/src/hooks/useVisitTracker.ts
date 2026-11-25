import { useEffect, useRef, type RefObject } from 'react'
import { useLocation } from 'react-router-dom'

import { ENV } from '@/config/env'
import { scrollPercent, trackingAllowed, type PageContext } from '@/lib/analytics'
import { sendReport } from '@/lib/beacon'
import { createTracker, randomId, type Tracker } from '@/lib/tracker'

type PrivacyNavigator = Navigator & { readonly globalPrivacyControl?: boolean }

const allowedHere = (): boolean => {
  if (typeof window === 'undefined') return false
  const nav = navigator as PrivacyNavigator
  return trackingAllowed({
    production: ENV.isProd,
    hostname: window.location.hostname,
    webdriver: nav.webdriver === true,
    globalPrivacyControl: nav.globalPrivacyControl === true,
    doNotTrack: nav.doNotTrack ?? null,
  })
}

const timeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
  } catch {
    // An engine without Intl time zones: the field is optional in the contract.
    return ''
  }
}

const browserContext = (path: string): PageContext => ({
  site: window.location.hostname,
  path,
  referrer: document.referrer,
  search: window.location.search,
  viewportWidth: window.innerWidth,
  viewportHeight: window.innerHeight,
  language: navigator.language ?? '',
  timeZone: timeZone(),
})

const browserTracker = (endpoint: string): Tracker =>
  createTracker({
    send: (payload) => {
      sendReport(endpoint, payload)
    },
    now: () => Date.now(),
    newId: randomId,
    context: browserContext,
    visible: () => document.visibilityState !== 'hidden',
  })

/** The visit's tracker, created on first use, or null where tracking is off. */
const ensureTracker = (ref: RefObject<Tracker | null>): Tracker | null => {
  const endpoint = ENV.analyticsEndpoint
  if (ref.current === null && endpoint !== null && allowedHere()) {
    ref.current = browserTracker(endpoint)
  }
  return ref.current
}

/**
 * Reports this visit to HA Group's CRM: a page view on every page, and how
 * long each one was looked at. Mounted once, by `SiteChrome`, so every style
 * has it. Does nothing at all in development, on localhost, in an automated
 * browser, when the visitor's browser sends Global Privacy Control or Do Not
 * Track, or when `ENV.analyticsEndpoint` is null.
 *
 * It runs only in effects, after hydration, so it never changes what a page
 * renders and costs the first paint nothing.
 */
export const useVisitTracker = (): void => {
  const { pathname } = useLocation()
  const tracker = useRef<Tracker | null>(null)

  // Once per mount: the tracker carries the visit across page changes.
  useEffect(() => {
    const t = ensureTracker(tracker)
    if (t === null) return undefined

    let frame = 0
    const onScroll = () => {
      if (frame !== 0) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        t.scrolled(
          scrollPercent(window.scrollY, window.innerHeight, document.documentElement.scrollHeight),
        )
      })
    }
    const onVisibility = () => t.visibility(document.visibilityState !== 'hidden')
    // Safari before 14.1 fires pagehide without a visibilitychange on close.
    const onPageHide = () => t.visibility(false)

    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [])

  useEffect(() => {
    ensureTracker(tracker)?.pageview(pathname)
  }, [pathname])
}
