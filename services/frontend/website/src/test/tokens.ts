import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

import { gamutMap, WHITE, type Rgb } from './color'

/**
 * Reads the design tokens out of the CSS and resolves them to real colours.
 *
 * Test-only. It exists so the contrast test can measure what a browser would
 * actually paint, for the base palette AND for every style's overrides, at
 * every brand hue the docs offer. A style is allowed to repoint
 * `--text-muted` at a different step; it is not allowed to make it
 * unreadable, and the only way to know which it did is to compute it.
 *
 * Deliberately a small parser rather than a real CSS one: it accepts exactly
 * the value forms a token file is permitted to use, and THROWS on anything
 * else. A style that writes `--text-primary: #777` fails the build naming the
 * file, which is the whole point. See doc/design.md, "What a style may change".
 */

const SRC = join(__dirname, '..')
const STYLES_DIR = join(SRC, 'styles')

/** A colour that still needs a hue: `oklch(L C var(--brand-hue))`. */
interface Relative {
  readonly kind: 'relative'
  readonly L: number
  readonly C: number
}

/** A colour that carries its own hue, or a literal. */
interface Absolute {
  readonly kind: 'absolute'
  readonly rgb: Rgb
}

type Colour = Relative | Absolute

/** The attribute selector ThemeProvider sets, escaped for a regex. */
const DARK_SELECTOR = "\\[data-theme='dark'\\]"

/** Pull the body of `<selector> { … }`. These blocks never nest. */
const block = (css: string, selector: string): string => {
  const pattern = new RegExp(`${selector}\\s*\\{([^}]*)\\}`, 'm')
  return css.match(pattern)?.[1] ?? ''
}

/** `--name: value;` pairs, in source order, so a later one wins. */
const declarations = (body: string): ReadonlyArray<[string, string]> =>
  [...body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map(
    (match) => [match[1] ?? '', (match[2] ?? '').trim()] as [string, string],
  )

const hexToRgb = (hex: string): Rgb => {
  const full =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex
  const value = Number.parseInt(full.slice(1), 16)
  // The rest of the pipeline works in LINEAR sRGB, so undo the transfer curve.
  const decode = (c: number) => {
    const v = c / 255
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return [decode((value >> 16) & 0xff), decode((value >> 8) & 0xff), decode(value & 0xff)]
}

/** The `@theme` ramps: every `--color-*`, keyed by name. */
export const readRamps = (css: string): ReadonlyMap<string, Colour> => {
  const ramps = new Map<string, Colour>()

  for (const [name, value] of declarations(block(css, '@theme'))) {
    if (!name.startsWith('color-')) continue

    const relative = value.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+var\(--brand-hue\)\s*\)$/)
    if (relative) {
      ramps.set(name, { kind: 'relative', L: Number(relative[1]), C: Number(relative[2]) })
      continue
    }

    const fixed = value.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/)
    if (fixed) {
      ramps.set(name, {
        kind: 'absolute',
        rgb: gamutMap(Number(fixed[1]), Number(fixed[2]), Number(fixed[3])),
      })
      continue
    }

    const hex = value.match(/^#[0-9a-fA-F]{3,8}$/)
    if (hex) ramps.set(name, { kind: 'absolute', rgb: hexToRgb(value) })
  }

  return ramps
}

/**
 * The semantic layer for one theme, resolved the way the CASCADE resolves it.
 *
 * The order matters and is not obvious. A style's `tokens.css` is imported
 * into `layer(components)`, and `index.css` defines both themes in
 * `@layer base`. Layer order beats selector specificity, so a style's
 * unqualified `:root` overrides the BASE stylesheet's `[data-theme='dark']`
 * block, not just its `:root`.
 *
 * Which means a style that repoints colours in `:root` and writes no dark
 * block has silently repointed the dark theme as well, and the theme toggle
 * does nothing. Reading only each source's own theme block, which an earlier
 * version of this file did, models a page the browser never paints.
 *
 *   light:  base :root                      -> style :root
 *   dark:   base :root -> base [dark]       -> style :root -> style [dark]
 */
export const readSemantic = (
  sources: readonly string[],
  theme: 'light' | 'dark',
): ReadonlyMap<string, string> => {
  const resolved = new Map<string, string>()

  const apply = (css: string, selector: string) => {
    for (const [name, value] of declarations(block(css, selector))) {
      if (name.startsWith('color-')) continue
      resolved.set(name, value)
    }
  }

  for (const css of sources) {
    apply(css, ':root')
    if (theme === 'dark') apply(css, DARK_SELECTOR)
  }

  return resolved
}

export interface Palette {
  /** A semantic token, e.g. `text-accent`, as the browser would paint it. */
  readonly colour: (token: string) => Rgb
  /** A ramp step, e.g. `color-brand-700`. */
  readonly ramp: (name: string) => Rgb
  readonly has: (token: string) => boolean
}

/**
 * Resolve a palette at one hue, for one theme.
 *
 * `sources` is the base stylesheet followed by any style override, later
 * winning. Every value must be one of the permitted forms; anything else
 * throws with the token's name, because a token nobody can resolve is a token
 * nobody has measured.
 */
export const palette = (
  sources: readonly string[],
  theme: 'light' | 'dark',
  hue: number,
  label = 'index.css',
): Palette => {
  const ramps = readRamps(sources[0] ?? '')
  const semantic = readSemantic(sources, theme)

  const rampRgb = (name: string): Rgb => {
    const entry = ramps.get(name)
    if (entry === undefined) throw new Error(`${label}: unknown ramp --${name}`)
    return entry.kind === 'relative' ? gamutMap(entry.L, entry.C, hue) : entry.rgb
  }

  const seen = new Set<string>()

  const resolve = (token: string): Rgb => {
    if (seen.has(token)) throw new Error(`${label}: --${token} refers to itself`)
    seen.add(token)

    const value = semantic.get(token)
    if (value === undefined) throw new Error(`${label}: --${token} is not defined for ${theme}`)

    const reference = value.match(/^var\(\s*--([\w-]+)\s*\)$/)
    if (reference) {
      const target = reference[1] ?? ''
      return target.startsWith('color-') ? rampRgb(target) : resolve(target)
    }

    if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return hexToRgb(value)

    const relative = value.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+var\(--brand-hue\)\s*\)$/)
    if (relative) return gamutMap(Number(relative[1]), Number(relative[2]), hue)

    const fixed = value.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/)
    if (fixed) return gamutMap(Number(fixed[1]), Number(fixed[2]), Number(fixed[3]))

    if (value === 'white') return WHITE

    throw new Error(
      `${label}: --${token} is "${value}", which the contrast test cannot resolve. ` +
        `A token file may use var(--color-*), another semantic token, a hex, or ` +
        `oklch(L C var(--brand-hue)). See doc/design.md.`,
    )
  }

  return {
    colour: (token) => {
      seen.clear()
      return resolve(token)
    },
    ramp: rampRgb,
    has: (token) => semantic.has(token),
  }
}

export const BASE_CSS = readFileSync(join(SRC, 'index.css'), 'utf8')

/** Every style folder that has a tokens.css, with its contents. */
export const styleTokenFiles = (): ReadonlyArray<[string, string]> =>
  readdirSync(STYLES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(STYLES_DIR, entry.name, 'tokens.css')))
    .map((entry) => [entry.name, readFileSync(join(STYLES_DIR, entry.name, 'tokens.css'), 'utf8')] as [string, string])
    .sort(([a], [b]) => a.localeCompare(b))
