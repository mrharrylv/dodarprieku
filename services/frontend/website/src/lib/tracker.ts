/**
 * One visit, from the first page view until the tab goes away.
 *
 * Holds the only state visit statistics have: the visit id, which page view
 * is open, and how long it has been looked at. It lives in memory and nowhere
 * else (no cookie, no local or session storage), so a reload or a new tab is a
 * new visit and nothing is left on the visitor's device. The CRM joins page
 * views into a visit by `sid`, and counts returning people, if it wants to, from
 * its own daily-salted hash of the request, never from anything stored here.
 *
 * Engaged time counts only while the tab is visible: a page left open behind
 * another window is not being read.
 */

import { engagementPayload, pageviewPayload, type PageContext, type TrackPayload } from './analytics'

export interface TrackerDeps {
  readonly send: (payload: TrackPayload) => void
  readonly now: () => number
  readonly newId: () => string
  readonly context: (path: string) => PageContext
  readonly visible: () => boolean
}

export interface Tracker {
  /** A page was opened. The same path twice in a row is one page view. */
  readonly pageview: (path: string) => void
  /** The tab was hidden or shown. Hiding reports the time so far. */
  readonly visibility: (visible: boolean) => void
  /** The visitor scrolled; only the deepest point of a page view is kept. */
  readonly scrolled: (percent: number) => void
}

interface OpenView {
  readonly pid: string
  readonly path: string
  readonly site: string
}

/** 16 random bytes as hex, from the platform's CSPRNG when there is one. */
export const randomId = (): string => {
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export const createTracker = (deps: TrackerDeps): Tracker => {
  const sid = deps.newId()
  let seq = 0
  let view: OpenView | null = null
  let engagedMs = 0
  let visibleSince: number | null = null
  let scrollPct = 0
  let reportedMs = 0

  const settle = (): void => {
    if (visibleSince === null) return
    const t = deps.now()
    engagedMs += Math.max(0, t - visibleSince)
    visibleSince = t
  }

  const report = (final: boolean): void => {
    if (view === null) return
    settle()
    // Nothing new since the last report (hidden twice, or a page closed the
    // instant it opened): an empty report is noise in the CRM.
    if (engagedMs <= reportedMs) return
    reportedMs = engagedMs
    deps.send(
      engagementPayload(
        { sid, pid: view.pid },
        { site: view.site, path: view.path, engagedMs, scrollPct, final },
        deps.now(),
      ),
    )
  }

  const pageview = (path: string): void => {
    if (view !== null && view.path === path) return
    report(true)

    const ctx = deps.context(path)
    seq += 1
    view = { pid: deps.newId(), path: ctx.path, site: ctx.site }
    engagedMs = 0
    reportedMs = 0
    scrollPct = 0
    visibleSince = deps.visible() ? deps.now() : null
    deps.send(pageviewPayload({ sid, pid: view.pid }, seq, ctx, deps.now()))
  }

  const visibility = (visible: boolean): void => {
    if (visible) {
      if (visibleSince === null) visibleSince = deps.now()
      return
    }
    report(false)
    visibleSince = null
  }

  const scrolled = (percent: number): void => {
    if (Number.isFinite(percent) && percent > scrollPct) scrollPct = Math.min(100, percent)
  }

  return { pageview, visibility, scrolled }
}
