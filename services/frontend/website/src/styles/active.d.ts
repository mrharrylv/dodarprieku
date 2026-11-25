/**
 * The compiled-in style.
 *
 * `vite.config.ts` aliases `@active-style` to `src/styles/<id>/`, where `<id>`
 * comes from `site.config.json` or `VITE_SITE_STYLE`. TypeScript is told only
 * the SHAPE, never the folder, so type-checking does not depend on any
 * particular style existing. Deleting one, including `classic`, still
 * type-checks; the build is what fails, loudly, if the active one is gone.
 */
declare module '@active-style/style' {
  import type { SiteStyle } from '@/styles/contract'

  const style: SiteStyle
  export default style
}
