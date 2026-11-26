import { ROUTES } from '@/config/site'
import { stripLocale } from './locale-path'

/**
 * The site is one page, the map. Every other address it used to have is a
 * deep link to the map with something open over it (Harry, 2026-11-26): a
 * charity's card, the registration panel, the account panel, the info panel.
 * Pure, and read from the URL, which the prerender knows as well as the
 * browser does.
 */

/** What the account panel shows: the account itself (or its login), "Aizmirsu paroli", or the set-password form from an email. */
export type AccountView = 'main' | 'forgot' | 'set-password'

/** The large panel docked on the right, over the map. */
export type Dock = { readonly kind: 'register' } | { readonly kind: 'account'; readonly view: AccountView }

export interface MapRoute {
  readonly dock: Dock | null
  /** `/par-projektu`: the info panel opens. */
  readonly info: boolean
  /** `/organizacija/<slug>`: the map flies to that charity with its card expanded. */
  readonly charitySlug: string | null
}

const NOTHING: MapRoute = { dock: null, info: false, charitySlug: null }

const DOCKS: ReadonlyMap<string, Dock> = new Map<string, Dock>([
  [ROUTES.register, { kind: 'register' }],
  [ROUTES.account, { kind: 'account', view: 'main' }],
  [ROUTES.forgotPassword, { kind: 'account', view: 'forgot' }],
  [ROUTES.setPassword, { kind: 'account', view: 'set-password' }],
])

/** Every route that renders the map, as opposed to a legal page or the 404. */
export const MAP_ROUTES: readonly string[] = [ROUTES.home, ROUTES.charity, ...DOCKS.keys(), ROUTES.about]

const routeOf = (pathname: string): string => stripLocale(pathname).replace(/\/+$/, '') || '/'

const decoded = (segment: string): string | null => {
  try {
    return decodeURIComponent(segment)
  } catch {
    // A malformed escape is no charity's slug: the map opens as usual.
    return null
  }
}

const slugOf = (route: string): string | null => {
  const prefix = `${ROUTES.charity}/`
  if (!route.startsWith(prefix)) return null
  const rest = route.slice(prefix.length)
  return rest === '' || rest.includes('/') ? null : decoded(rest)
}

/** Whether `pathname` renders the map: one of `MAP_ROUTES`, or a charity's `/organizacija/<slug>`. */
export const isMapPath = (pathname: string): boolean => {
  const route = routeOf(pathname)
  return MAP_ROUTES.includes(route) || slugOf(route) !== null
}

/** What `pathname` opens over the map. */
export const mapRouteOf = (pathname: string): MapRoute => {
  const route = routeOf(pathname)
  const dock = DOCKS.get(route)
  if (dock !== undefined) return { ...NOTHING, dock }
  if (route === ROUTES.about) return { ...NOTHING, info: true }
  return { ...NOTHING, charitySlug: slugOf(route) }
}

/** The address of a dock: what the register button and the rail's account link point at. */
export const dockPath = (dock: Dock): string => {
  if (dock.kind === 'register') return ROUTES.register
  if (dock.view === 'forgot') return ROUTES.forgotPassword
  if (dock.view === 'set-password') return ROUTES.setPassword
  return ROUTES.account
}

/** Two docks are the same panel (the account panel's views are one panel). */
export const sameDock = (a: Dock | null, b: Dock | null): boolean => a?.kind === b?.kind
