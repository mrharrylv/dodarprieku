import type { SiteStyle } from './contract'

/**
 * Every style on disk, discovered rather than listed.
 *
 * The only place in the source that knows about more than one style, and it
 * learns them from the folders, so adding or deleting a style never means
 * editing a list. Used by the tests and the docs generator. The APP does not
 * use it: the active style is compiled in through the `@active-style` alias
 * that `vite.config.ts` resolves from `site.config.json`, so inactive styles
 * are not in the bundle at all.
 */
export const STYLE_MODULES = import.meta.glob<{ default: SiteStyle }>('./*/style.ts')

const ID_FROM_PATH = /^\.\/([^/]+)\/style\.ts$/

/** `./classic/style.ts` becomes `classic`. */
export const styleIdFromPath = (path: string): string => path.replace(ID_FROM_PATH, '$1')

/** Sorted, so output that lists them is stable. */
export const styleIds = (): readonly string[] =>
  Object.keys(STYLE_MODULES).map(styleIdFromPath).sort()

/** `null` for an id that is not a folder, rather than a throw from `import()`. */
export const loadStyle = async (id: string): Promise<SiteStyle | null> => {
  const loader = STYLE_MODULES[`./${id}/style.ts`]
  if (loader === undefined) return null
  return (await loader()).default
}
