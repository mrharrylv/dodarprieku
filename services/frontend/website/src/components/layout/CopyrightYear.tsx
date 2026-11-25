import { useHydrated } from '@/hooks/useHydrated'

/**
 * The year for a footer's copyright line.
 *
 * Every page is prerendered at build time, so the server's "this year" is the
 * year of the build. A site deployed in December and visited in January would
 * otherwise fail to hydrate on every page load, all year, over one number.
 * While hydrating it renders the build's year, which the build bakes in
 * (`__BUILD_YEAR__`, `vite.config.ts`), and the visitor's own year straight
 * after.
 */
export const CopyrightYear = () => {
  const hydrated = useHydrated()
  return <>{hydrated ? new Date().getFullYear() : __BUILD_YEAR__}</>
}
