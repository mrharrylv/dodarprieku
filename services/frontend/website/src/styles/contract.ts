import type { ComponentType } from 'react'

/**
 * What a style is.
 *
 * A style owns everything a visitor SEES that is not content: the shell
 * (header, navigation, footer), the four marketing pages, its token overrides
 * in `tokens.css`, and its motion. It owns nothing a visitor READS: every
 * string comes from the locale files, every list from `src/data/`, every value
 * from `src/config/`. That split is what lets a style be deleted with
 * `rm -rf src/styles/<id>` and nothing else change.
 *
 * The legal pages, the 404 and the contact form are shared and render inside
 * whichever shell is active. A style's contact page must mount `ContactForm`.
 *
 * `src/styles/styles.test.tsx` renders every folder on disk against this
 * contract, so a style that forgets the skip link or the footer credit fails
 * the build rather than shipping.
 */
export interface SiteStyle {
  /** Must equal the folder name under `src/styles/`. */
  readonly id: string
  /**
   * Header, navigation, `<main id={MAIN_CONTENT_ID} tabIndex={-1}><Outlet /></main>`,
   * footer, and `<SiteChrome />`.
   */
  readonly Shell: ComponentType
  readonly pages: {
    readonly Home: ComponentType
    readonly Services: ComponentType
    readonly About: ComponentType
    readonly Contact: ComponentType
  }
}
