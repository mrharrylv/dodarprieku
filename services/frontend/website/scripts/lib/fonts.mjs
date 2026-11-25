/**
 * Text drawn as SVG paths from the site's own self-hosted font files.
 *
 * sharp renders an SVG `<text>` by asking the operating system for the font.
 * On a Mac that silently becomes Helvetica, on a bare CI box it may become
 * nothing at all, and either way the share card stops matching the site. A
 * path drawn from the woff2 in node_modules looks the same on every machine.
 *
 * The @fontsource-variable packages ship one variable woff2 per script subset
 * (latin, latin-ext, cyrillic, ...). `wawoff2` unpacks the woff2 into a plain
 * font file, `fontkit` fixes the weight axis and lays out the glyphs. A "stack"
 * is a list of those fonts; every character is drawn from the first one that
 * has it, so "Rīga" takes latin plus latin-ext and "Рига" takes cyrillic.
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import * as fontkit from 'fontkit'
import wawoff2 from 'wawoff2'

const require = createRequire(import.meta.url)

/** The `files/` folder of an installed @fontsource-variable package. */
export const fontsourceDir = (pkg) => join(dirname(require.resolve(`${pkg}/package.json`)), 'files')

/** One variable woff2, pinned to `weight`. */
export const openFont = async (file, weight) => {
  // A plain Uint8Array, not a Buffer: the WebAssembly binding checks the type
  // with instanceof, which a Buffer from another realm (a jsdom test) fails.
  const sfnt = await wawoff2.decompress(new Uint8Array(readFileSync(file)))
  const font = fontkit.create(Buffer.from(sfnt))
  return 'wght' in font.variationAxes ? font.getVariation({ wght: weight }) : font
}

/**
 * Opens every file in order at one weight. The order is the fallback order.
 *
 * One at a time, deliberately: wawoff2 is a single WebAssembly instance with
 * one output buffer, and two decompressions in flight at once hand back each
 * other's bytes ("Unknown font format").
 */
export const loadStack = async (files, weight) => {
  if (files.length === 0) throw new Error('loadStack: no font files given')
  return files.reduce(
    async (pending, file) => [...(await pending), await openFont(file, weight)],
    Promise.resolve([]),
  )
}

const fontFor = (stack, char) => {
  const codePoint = char.codePointAt(0)
  const font = stack.find((candidate) => candidate.hasGlyphForCodePoint(codePoint))
  if (font === undefined) {
    throw new Error(`No font in the stack draws "${char}" (U+${codePoint.toString(16).toUpperCase()})`)
  }
  return font
}

/**
 * Splits `text` into runs that one font draws, so kerning and ligatures still
 * apply inside each run. A space goes with the run before it.
 */
export const runsOf = (stack, text) =>
  Array.from(text).reduce((runs, char) => {
    const last = runs[runs.length - 1]
    const font = char.trim() === '' && last !== undefined ? last.font : fontFor(stack, char)
    return last !== undefined && last.font === font
      ? [...runs.slice(0, -1), { font, text: last.text + char }]
      : [...runs, { font, text: char }]
  }, [])

/** Width of `text` at a font size of 1 px. Scale it linearly for any other size. */
const unitWidth = (stack, text) =>
  runsOf(stack, text).reduce(
    (sum, run) => sum + run.font.layout(run.text).advanceWidth / run.font.unitsPerEm,
    0,
  )

/**
 * A measuring function for `og-layout.mjs`: `(text, size) => px`. Outlines are
 * unhinted, so width scales linearly with size and each string is laid out
 * once, however many sizes the layout tries.
 */
export const measurer = (stack) => {
  const cache = new Map()
  return (text, size) => {
    if (!cache.has(text)) cache.set(text, unitWidth(stack, text))
    return cache.get(text) * size
  }
}

/** Ascent and descent of the stack's first font, as fractions of the size. */
export const verticalMetrics = (stack) => {
  const [font] = stack
  return { ascent: font.ascent / font.unitsPerEm, descent: -font.descent / font.unitsPerEm }
}

/** Enough digits for sub-pixel placement, without a kilobyte of noise per glyph. */
const fixed = (value, digits) => Number(value.toFixed(digits))

/**
 * SVG markup for one line of text, centred on `x`, sitting on baseline `y`.
 * Glyph outlines are in font units with y pointing up, so each run is flipped
 * and scaled into place with one transform.
 */
export const textMarkup = (stack, text, { size, x, y, fill, opacity = 1 }) => {
  const width = measurer(stack)(text, size)
  const runs = runsOf(stack, text)

  const { markup } = runs.reduce(
    (acc, run) => {
      const scale = size / run.font.unitsPerEm
      const laid = run.font.layout(run.text)
      const { d, advance } = laid.glyphs.reduce(
        (glyphs, glyph, index) => {
          const position = laid.positions[index]
          const path = glyph.path.translate(glyphs.advance + position.xOffset, position.yOffset).toSVG()
          return { d: glyphs.d + path, advance: glyphs.advance + position.xAdvance }
        },
        { d: '', advance: 0 },
      )
      const group = `<g transform="translate(${fixed(acc.cursor, 2)} ${fixed(y, 2)}) scale(${fixed(scale, 6)} ${fixed(-scale, 6)})"><path d="${d}"/></g>`
      return { markup: acc.markup + group, cursor: acc.cursor + advance * scale }
    },
    { markup: '', cursor: x - width / 2 },
  )

  return `<g fill="${fill}" fill-opacity="${opacity}">${markup}</g>`
}

/**
 * Where one character's outline sits, as fractions of the font size: its
 * lowest and highest point above the baseline. For centring a lone letter by
 * what it draws rather than by its line box.
 */
export const glyphExtent = (stack, char) => {
  const font = fontFor(stack, char)
  const { minY, maxY } = font.layout(char).glyphs[0].bbox
  return { minY: minY / font.unitsPerEm, maxY: maxY / font.unitsPerEm }
}
