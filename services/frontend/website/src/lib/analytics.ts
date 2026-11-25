/**
 * Visit statistics: what one report to the CRM says, built from plain inputs.
 *
 * Every function here is pure. The browser is read in one place
 * (`hooks/useVisitTracker.ts`), the state of a visit lives in `tracker.ts`,
 * and the request goes out through `beacon.ts`. That keeps what is collected
 * reviewable in one file: if a field is not built here, it is not sent.
 *
 * What is never sent: a cookie or any stored identifier (the visit id lives in
 * memory and dies with the tab), the query string or the fragment of a page
 * address (they can hold an email address or a token), the path of the page a
 * visitor came from (only its origin), the user agent (the CRM reads the
 * request's own header) and the IP address (the CRM sees it and must not keep
 * it). The contract the CRM implements is doc/visit-tracking.md.
 */

import { ANALYTICS, BREAKPOINTS } from '@/config/constants'

export type DeviceClass = 'mobile' | 'tablet' | 'desktop'

/** The same cut-offs as the Tailwind breakpoints: below `md` is a phone. */
export const deviceClass = (viewportWidth: number): DeviceClass => {
  if (viewportWidth < BREAKPOINTS.md) return 'mobile'
  if (viewportWidth < BREAKPOINTS.lg) return 'tablet'
  return 'desktop'
}

/** Cut a string to `max` characters, never throwing on a non-string. */
export const clip = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : ''

/**
 * The origin of the page the visitor came from, or '' for none.
 *
 * Only the origin: a full referrer can carry a search query or a webmail
 * message id. A referrer on this same host is a reload or an in-site link,
 * not a source, so it is '' too, and so is anything that is not an http(s)
 * URL (`android-app://`, a malformed string).
 */
export const externalReferrer = (referrer: string, host: string): string => {
  if (referrer === '') return ''
  try {
    const url = new URL(referrer)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return ''
    if (url.hostname === host) return ''
    return url.origin
  } catch {
    // Not a URL at all: there is no source to report, which is what '' says.
    return ''
  }
}

/**
 * The campaign parameters on the landing address, and nothing else from the
 * query string. `?ref=offer-email` on a link Harry sends a client is how the
 * CRM tells which message was opened.
 */
export const campaignFrom = (search: string): Readonly<Record<string, string>> => {
  const params = new URLSearchParams(search)
  return Object.fromEntries(
    ANALYTICS.campaignParams
      .map((name) => [name, clip(params.get(name), ANALYTICS.maxCampaign)] as const)
      .filter(([, value]) => value !== ''),
  )
}

/** How far down the page the visitor has seen, 0 to 100. */
export const scrollPercent = (scrollY: number, viewportHeight: number, documentHeight: number): number => {
  if (!(documentHeight > 0) || !(viewportHeight > 0)) return 0
  if (documentHeight <= viewportHeight) return 100
  const seen = ((scrollY + viewportHeight) / documentHeight) * 100
  return Math.max(0, Math.min(100, Math.round(seen)))
}

export interface TrackingConditions {
  /** A production build. Development and test runs never report. */
  readonly production: boolean
  readonly hostname: string
  /** `navigator.webdriver`: an automated browser (a test run, a crawler). */
  readonly webdriver: boolean
  /** `navigator.globalPrivacyControl`. */
  readonly globalPrivacyControl: boolean
  /** `navigator.doNotTrack`, as the browser reports it. */
  readonly doNotTrack: string | null
}

const LOCAL_HOST = /^(localhost|127(?:\.\d{1,3}){3}|\[::1\]|::1|0\.0\.0\.0)$|\.local$|\.localhost$/i

/**
 * Whether this page load may report at all.
 *
 * Not on a developer's machine or `make preview` (a localhost visit is not a
 * client), not from an automated browser, and not when the visitor's browser
 * asks not to be tracked (Global Privacy Control or Do Not Track). The last
 * one is also how Harry keeps his own visits out: turn on "Do Not Track" in
 * the browser he checks previews with.
 */
export const trackingAllowed = (c: TrackingConditions): boolean =>
  c.production &&
  c.hostname !== '' &&
  !LOCAL_HOST.test(c.hostname) &&
  !c.webdriver &&
  !c.globalPrivacyControl &&
  c.doNotTrack !== '1' &&
  c.doNotTrack !== 'yes'

/** What the browser says about the page being viewed. */
export interface PageContext {
  readonly site: string
  readonly path: string
  readonly referrer: string
  readonly search: string
  readonly viewportWidth: number
  readonly viewportHeight: number
  readonly language: string
  readonly timeZone: string
}

export interface VisitIds {
  /** One id per visit: a tab's page load, kept in memory only. */
  readonly sid: string
  /** One id per page view, so its engagement reports can be matched to it. */
  readonly pid: string
}

export interface PageviewPayload {
  readonly v: typeof ANALYTICS.schemaVersion
  readonly type: 'pageview'
  readonly site: string
  readonly sid: string
  readonly pid: string
  readonly seq: number
  readonly path: string
  readonly ref: string
  readonly campaign: Readonly<Record<string, string>>
  readonly device: DeviceClass
  readonly vw: number
  readonly vh: number
  readonly lang: string
  readonly tz: string
  readonly ts: number
}

export interface EngagementPayload {
  readonly v: typeof ANALYTICS.schemaVersion
  readonly type: 'engagement'
  readonly site: string
  readonly sid: string
  readonly pid: string
  readonly path: string
  readonly engaged_ms: number
  readonly scroll_pct: number
  readonly final: boolean
  readonly ts: number
}

export type TrackPayload = PageviewPayload | EngagementPayload

const wholeNonNegative = (n: number): number => (Number.isFinite(n) && n > 0 ? Math.round(n) : 0)

/**
 * A page was opened. `seq` is 1 for the page the visit landed on; only that
 * one carries the referrer and the campaign, because every later page of the
 * visit was reached from this site.
 */
export const pageviewPayload = (
  ids: VisitIds,
  seq: number,
  ctx: PageContext,
  ts: number,
): PageviewPayload => {
  const landing = seq === 1
  return {
    v: ANALYTICS.schemaVersion,
    type: 'pageview',
    site: clip(ctx.site, ANALYTICS.maxHost),
    sid: ids.sid,
    pid: ids.pid,
    seq,
    path: clip(ctx.path, ANALYTICS.maxPath) || '/',
    ref: landing ? clip(externalReferrer(ctx.referrer, ctx.site), ANALYTICS.maxHost + 8) : '',
    campaign: landing ? campaignFrom(ctx.search) : {},
    device: deviceClass(ctx.viewportWidth),
    vw: wholeNonNegative(ctx.viewportWidth),
    vh: wholeNonNegative(ctx.viewportHeight),
    lang: clip(ctx.language, ANALYTICS.maxLanguage),
    tz: clip(ctx.timeZone, ANALYTICS.maxTimeZone),
    ts,
  }
}

export interface EngagementInput {
  readonly site: string
  readonly path: string
  readonly engagedMs: number
  readonly scrollPct: number
  /** True when the visitor has left this page view for good (another page). */
  readonly final: boolean
}

/**
 * How long a page view has been looked at so far. Sent each time the tab is
 * hidden and once when the visitor moves on, each time with the running total,
 * so the CRM keeps the largest `engaged_ms` per `pid` and loses nothing when a
 * tab is closed without warning.
 */
export const engagementPayload = (ids: VisitIds, input: EngagementInput, ts: number): EngagementPayload => ({
  v: ANALYTICS.schemaVersion,
  type: 'engagement',
  site: clip(input.site, ANALYTICS.maxHost),
  sid: ids.sid,
  pid: ids.pid,
  path: clip(input.path, ANALYTICS.maxPath) || '/',
  engaged_ms: Math.min(wholeNonNegative(input.engagedMs), ANALYTICS.maxEngagedMs),
  scroll_pct: Math.max(0, Math.min(100, wholeNonNegative(input.scrollPct))),
  final: input.final,
  ts,
})
