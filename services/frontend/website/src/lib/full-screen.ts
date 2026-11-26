import { isMapPath } from './map-route'

/**
 * Whether a page fills the viewport on its own, with no site header and no
 * footer: the map, at every address that opens it (`lib/map-route`). Read
 * from the URL, which the prerender knows as well as the browser does, so
 * the first render is the same on both sides.
 */
export const isFullScreenPage = (pathname: string): boolean => isMapPath(pathname)
