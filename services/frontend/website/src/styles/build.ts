/**
 * Build-time style resolution, kept out of `vite.config.ts` so it can be
 * tested.
 *
 * It decides which style folder is compiled in and rewrites two markers in
 * `index.css`. Both decisions have failure modes that no runtime test would
 * catch, because a stylesheet that is missing half its classes still renders,
 * still passes jsdom, and only looks wrong to a human:
 *
 *  - a blanket `@source not "./styles/**"` with the active folder re-included
 *    strips the ACTIVE style's classes, shipping a site with no layout;
 *  - an unknown id silently produces an unresolved import rather than saying
 *    which styles exist.
 *
 * `build.test.ts` pins both.
 */

/** A folder name: lowercase, digits and hyphens, starting with a letter. */
export const STYLE_ID = /^[a-z][a-z0-9-]*$/

export class UnknownStyleError extends Error {
  // Declared, not parameter properties: `erasableSyntaxOnly` in tsconfig
  // forbids the shorthand, because it is syntax that has to be COMPILED away
  // rather than merely erased, and this project strips types instead.
  readonly id: string
  readonly available: readonly string[]

  constructor(id: string, available: readonly string[]) {
    super(
      `[styles] "${id}" is not a style. site.config.json (or VITE_SITE_STYLE) must name a ` +
        `folder under src/styles/ that contains style.ts. ` +
        `Available: ${available.length > 0 ? available.join(', ') : 'none'}.`,
    )
    this.name = 'UnknownStyleError'
    this.id = id
    this.available = available
  }
}

/**
 * Which style is active.
 *
 * `VITE_SITE_STYLE` beats `site.config.json`, so CI can preview a style
 * without a commit, but the committed file is what a site actually ships.
 * An id that is not a folder throws HERE, at config time, naming the styles
 * that do exist. That is the "I deleted the active style" error, and it is
 * meant to be loud rather than a puzzle three steps later.
 */
export const resolveActiveStyle = ({
  fromEnv = '',
  fromFile = '',
  available,
}: {
  fromEnv?: string
  fromFile?: string
  available: readonly string[]
}): string => {
  const id = (fromEnv.trim() || fromFile.trim()).trim()
  if (!STYLE_ID.test(id) || !available.includes(id)) {
    throw new UnknownStyleError(id, available)
  }
  return id
}

/**
 * Rewrite the two markers in `index.css`.
 *
 * The tokens marker becomes an `@import` of the active style's overrides into
 * the `components` layer, so they beat the base semantic tokens in
 * `@layer base`.
 *
 * The source marker becomes one `@source not` per INACTIVE style. Tailwind
 * scans the whole tree by default, so the active folder needs no inclusion,
 * and an exclusion would beat one anyway.
 */
export const transformIndexCss = (
  code: string,
  { id, available }: { id: string; available: readonly string[] },
): string => {
  const exclusions = available
    .filter((other) => other !== id)
    .map((other) => `@source not "./styles/${other}";`)
    .join('\n')

  return code
    .replace('/* @active-style:tokens */', `@import './styles/${id}/tokens.css' layer(components);`)
    .replace('/* @active-style:source */', exclusions)
}
