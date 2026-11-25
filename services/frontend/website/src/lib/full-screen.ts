import { ROUTES } from '@/config/site'
import { stripLocale } from './locale-path'

/**
 * Whether a page fills the viewport on its own, with no site header and no
 * footer: today only the map, the home page. Read from the URL, which the
 * prerender knows as well as the browser does, so the first render is the
 * same on both sides.
 */
export const isFullScreenPage = (pathname: string): boolean => stripLocale(pathname) === ROUTES.home
