/**
 * Where everything on the 1200x630 share card goes.
 *
 * Pure maths: no fonts, no files. The text measurer is passed in, so the test
 * can drive this with the real fonts and with a stand-in alike.
 *
 * Everything that carries meaning sits inside the CENTRAL SQUARE of the card.
 * A 1200x630 image is not shown at 1200x630 very often: Google's result
 * thumbnail, WhatsApp's small preview and several chat apps crop it to a
 * square around the middle. A logo at the left edge and text at the right,
 * which is what this card used to be, survives that crop as a few letters of
 * the headline and no logo at all. That is how a Google thumbnail once read
 * "GROU".
 *
 * Nothing is ever allowed to overflow. If the brand name or the headline
 * cannot fit the square at the smallest permitted size, this throws, and the
 * fix is shorter copy, not a clipped image.
 */

export const CARD = Object.freeze({ width: 1200, height: 630 })

export const SPEC = Object.freeze({
  /** Margin kept clear inside the square, so a rounded or circular crop keeps it too. */
  inset: 56,
  /** Edge of the logo tile. */
  tile: 168,
  gapAfterTile: 36,
  brand: Object.freeze({ maxSize: 76, minSize: 40 }),
  gapAfterBrand: 18,
  headline: Object.freeze({ maxSize: 44, minSize: 26, maxLines: 3, lineHeight: 1.22 }),
  /** Narrowing step when balancing wrapped lines. */
  balanceStep: 8,
  /** The photo layout: a hero image with the brand name beneath it. */
  photo: Object.freeze({
    gap: 28,
    brand: Object.freeze({ maxSize: 56, minSize: 30 }),
    shadow: Object.freeze({ blur: 14, dy: 16, opacity: 0.35 }),
  }),
})

/** The central square of the card, less the inset. */
export const safeSquare = (card = CARD, inset = SPEC.inset) => {
  const side = Math.min(card.width, card.height)
  return {
    x: (card.width - side) / 2 + inset,
    y: (card.height - side) / 2 + inset,
    width: side - inset * 2,
    height: side - inset * 2,
  }
}

/** True when `box` lies entirely inside `outer`. */
export const isInside = (box, outer) =>
  box.x >= outer.x - 1e-6 &&
  box.y >= outer.y - 1e-6 &&
  box.x + box.width <= outer.x + outer.width + 1e-6 &&
  box.y + box.height <= outer.y + outer.height + 1e-6

/** Greedy word wrap. A word wider than `maxWidth` gets a line of its own. */
export const wrapWords = (text, maxWidth, widthOf) =>
  text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .reduce((lines, word) => {
      const last = lines[lines.length - 1]
      if (last === undefined) return [word]
      const joined = `${last} ${word}`
      return widthOf(joined) <= maxWidth ? [...lines.slice(0, -1), joined] : [...lines, word]
    }, [])

/**
 * Wraps, then narrows the measure while the line count holds, so a headline
 * breaks into lines of similar length instead of leaving one word stranded on
 * the last line. The same thing CSS `text-wrap: balance` does.
 */
export const balancedWrap = (text, maxWidth, widthOf, step = SPEC.balanceStep) => {
  const lines = wrapWords(text, maxWidth, widthOf)
  const narrower = maxWidth - step
  if (lines.length <= 1 || narrower <= 0) return lines
  const tighter = wrapWords(text, narrower, widthOf)
  const fits = tighter.every((line) => widthOf(line) <= narrower)
  return tighter.length === lines.length && fits ? balancedWrap(text, narrower, widthOf, step) : lines
}

const sizesFrom = (max, min) => Array.from({ length: max - min + 1 }, (_, i) => max - i)

const fitBrand = (brand, width, measure, spec) => {
  const size = sizesFrom(spec.brand.maxSize, spec.brand.minSize).find(
    (candidate) => measure.brand(brand, candidate) <= width,
  )
  if (size === undefined) {
    throw new Error(
      `The brand name "${brand}" does not fit ${width}px even at ${spec.brand.minSize}px. ` +
        'Use a shorter SITE.name, or draw the name into favicon.svg instead.',
    )
  }
  return size
}

const fitHeadline = (headline, width, measure, spec) => {
  if (headline.trim() === '') return { size: spec.headline.maxSize, lines: [] }
  for (const size of sizesFrom(spec.headline.maxSize, spec.headline.minSize)) {
    const widthOf = (text) => measure.headline(text, size)
    const lines = balancedWrap(headline, width, widthOf)
    if (lines.length <= spec.headline.maxLines && lines.every((line) => widthOf(line) <= width)) {
      return { size, lines }
    }
  }
  throw new Error(
    `The headline "${headline}" does not fit ${spec.headline.maxLines} lines of ${width}px ` +
      `even at ${spec.headline.minSize}px. Shorten share.headline in the default locale's map.json.`,
  )
}

const lineBox = (centreX, baseline, width, size, metrics) => ({
  x: centreX - width / 2,
  y: baseline - metrics.ascent * size,
  width,
  height: (metrics.ascent + metrics.descent) * size,
})

/**
 * @param {{
 *   brand: string,
 *   headline: string,
 *   measure: { brand: (text: string, size: number) => number, headline: (text: string, size: number) => number },
 *   metrics: { brand: { ascent: number, descent: number }, headline: { ascent: number, descent: number } },
 *   card?: { width: number, height: number },
 *   spec?: typeof SPEC,
 * }} input
 */
export const layoutShareCard = ({ brand, headline, measure, metrics, card = CARD, spec = SPEC }) => {
  if (brand.trim() === '') throw new Error('The share card needs a brand name')

  const safe = safeSquare(card, spec.inset)
  const centreX = safe.x + safe.width / 2

  const brandSize = fitBrand(brand, safe.width, measure, spec)
  const fitted = fitHeadline(headline, safe.width, measure, spec)
  const step = spec.headline.lineHeight * fitted.size

  const brandHeight = (metrics.brand.ascent + metrics.brand.descent) * brandSize
  const headlineHeight =
    fitted.lines.length === 0
      ? 0
      : spec.gapAfterBrand + step * (fitted.lines.length - 1) + (metrics.headline.ascent + metrics.headline.descent) * fitted.size
  const total = spec.tile + spec.gapAfterTile + brandHeight + headlineHeight

  if (total > safe.height) {
    throw new Error(`The share card's content is ${Math.ceil(total)}px tall; the safe square is ${safe.height}px`)
  }

  const top = safe.y + (safe.height - total) / 2
  const tile = { x: centreX - spec.tile / 2, y: top, width: spec.tile, height: spec.tile }

  const brandBaseline = tile.y + tile.height + spec.gapAfterTile + metrics.brand.ascent * brandSize
  const brandWidth = measure.brand(brand, brandSize)
  const brandBottom = brandBaseline + metrics.brand.descent * brandSize
  const firstBaseline = brandBottom + spec.gapAfterBrand + metrics.headline.ascent * fitted.size

  const lines = fitted.lines.map((text, index) => {
    const baseline = firstBaseline + step * index
    const width = measure.headline(text, fitted.size)
    return { text, baseline, box: lineBox(centreX, baseline, width, fitted.size, metrics.headline) }
  })

  return {
    card,
    safe,
    centreX,
    tile,
    brand: {
      text: brand,
      size: brandSize,
      baseline: brandBaseline,
      box: lineBox(centreX, brandBaseline, brandWidth, brandSize, metrics.brand),
    },
    headline: { size: fitted.size, lines },
  }
}

/** A box grown by `margin` on each side, and by `dy` more at the bottom, less `dy` at the top. */
const shadowBoxOf = (box, { blur, dy }) => {
  const reach = blur * 2
  return {
    x: box.x - reach,
    y: box.y - reach + Math.min(dy, 0),
    width: box.width + reach * 2,
    height: box.height + reach * 2 + Math.abs(dy),
  }
}

/**
 * The PHOTO card: a hero image (a product shot, a portrait, a cut-out) on the
 * branded ground, with the brand name beneath it.
 *
 * The photo is CONTAINED, never cropped or stretched: it is scaled to the
 * largest size that fits above the brand name inside the central square, and
 * centred. A cut-out keeps its shape and its transparency, and the soft
 * shadow follows the alpha. Same rule as the wordmark card: everything that
 * carries meaning is inside the central square, and nothing overflows.
 *
 * @param {{
 *   brand: string,
 *   photo: { width: number, height: number },
 *   measure: { brand: (text: string, size: number) => number },
 *   metrics: { brand: { ascent: number, descent: number } },
 *   card?: { width: number, height: number },
 *   spec?: typeof SPEC,
 * }} input
 */
export const layoutPhotoCard = ({ brand, photo, measure, metrics, card = CARD, spec = SPEC }) => {
  if (brand.trim() === '') throw new Error('The share card needs a brand name')
  if (!(photo.width > 0) || !(photo.height > 0)) throw new Error('The share photo has no size')

  const safe = safeSquare(card, spec.inset)
  const centreX = safe.x + safe.width / 2

  const brandSize = fitBrand(brand, safe.width, measure, { brand: spec.photo.brand })
  const brandHeight = (metrics.brand.ascent + metrics.brand.descent) * brandSize
  const room = { width: safe.width, height: safe.height - spec.photo.gap - brandHeight }
  if (room.height <= 0) {
    throw new Error(`The brand name leaves no room for a photo: the safe square is ${safe.height}px tall`)
  }

  const scale = Math.min(room.width / photo.width, room.height / photo.height)
  const size = { width: photo.width * scale, height: photo.height * scale }
  const top = safe.y + (safe.height - (size.height + spec.photo.gap + brandHeight)) / 2
  const box = { x: centreX - size.width / 2, y: top, width: size.width, height: size.height }

  const brandBaseline = box.y + box.height + spec.photo.gap + metrics.brand.ascent * brandSize
  return {
    card,
    safe,
    centreX,
    photo: { box, scale, shadow: spec.photo.shadow, shadowBox: shadowBoxOf(box, spec.photo.shadow) },
    brand: {
      text: brand,
      size: brandSize,
      baseline: brandBaseline,
      box: lineBox(centreX, brandBaseline, measure.brand(brand, brandSize), brandSize, metrics.brand),
    },
  }
}
