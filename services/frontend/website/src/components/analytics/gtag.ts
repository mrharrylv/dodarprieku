/**
 * Google Analytics (gtag.js), loaded by URL so production's CSP
 * (`script-src 'self'` plus googletagmanager.com) allows it; no inline script.
 * Only `GoogleAnalytics` calls these, and only after consent.
 */

export const GTAG_ORIGIN = 'https://www.googletagmanager.com'
export const GTAG_SCRIPT_ID = 'dodar-gtag'

type GtagWindow = Window & {
  dataLayer?: unknown[]
  gtag?: (...args: unknown[]) => void
} & Record<string, unknown>

const currentWindow = (): GtagWindow => window as unknown as GtagWindow

export const gtagScriptUrl = (id: string): string => `${GTAG_ORIGIN}/gtag/js?id=${encodeURIComponent(id)}`

/** Adds the script once and configures it: IP anonymised, page views sent by us on each route. */
export const loadGtag = (id: string, win: GtagWindow = currentWindow()): void => {
  win[`ga-disable-${id}`] = false
  if (win.document.getElementById(GTAG_SCRIPT_ID) !== null) return
  win.dataLayer = win.dataLayer ?? []
  // gtag.js reads `arguments` objects from the data layer, not arrays.
  win.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    win.dataLayer?.push(arguments)
  }
  win.gtag('js', new Date())
  win.gtag('config', id, { anonymize_ip: true, send_page_view: false })
  const script = win.document.createElement('script')
  script.id = GTAG_SCRIPT_ID
  script.async = true
  script.src = gtagScriptUrl(id)
  win.document.head.appendChild(script)
}

/** Withdrawn consent: GA stops sending, as Google documents, until the page is reloaded without it. */
export const disableGtag = (id: string, win: GtagWindow = currentWindow()): void => {
  win[`ga-disable-${id}`] = true
}

export const sendPageView = (path: string, win: GtagWindow = currentWindow()): void => {
  win.gtag?.('event', 'page_view', {
    page_path: path,
    page_location: `${win.location.origin}${path}`,
    page_title: win.document.title,
  })
}
