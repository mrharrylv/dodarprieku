import type { ComponentType } from 'react'

/**
 * What a style is.
 *
 * A style owns everything a visitor SEES that is not content: the shell
 * (header, navigation, footer), its token
 * overrides in `tokens.css`, and its motion. It owns nothing a visitor READS: every
 * string comes from the locale files, every list from `src/data/`, every value
 * from `src/config/`. That split is what lets a style be deleted with
 * `rm -rf src/styles/<id>` and nothing else change.
 *
 * Dod ar prieku is an application, not a marketing site: the map is its one
 * page, shared under `src/pages/map`, with every other address a panel over
 * it (`lib/map-route`). The legal pages and the 404 render inside whichever
 * shell is active.
 *
 * `src/styles/styles.test.tsx` renders every folder on disk against this
 * contract, so a style that forgets the skip link, the footer credit or the
 * register button fails the build rather than shipping.
 */
export interface SiteStyle {
  /** Must equal the folder name under `src/styles/`. */
  readonly id: string
  /**
   * Header, navigation, `<main id={MAIN_CONTENT_ID} tabIndex={-1}><Outlet /></main>`,
   * footer, and `<SiteChrome />`. On a page `isFullScreenPage()` names (the
   * map) it leaves the header and the footer out and lets `main` fill the
   * viewport; the skip link, `SiteChrome` and `main` stay.
   */
  readonly Shell: ComponentType
}
