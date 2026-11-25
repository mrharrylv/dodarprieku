import { join } from 'node:path'

import { beforeAll, describe, it, expect } from 'vitest'

import { fontsourceDir, loadStack, measurer, verticalMetrics } from './fonts.mjs'
import { CARD, SPEC, balancedWrap, isInside, layoutPhotoCard, layoutShareCard, safeSquare, wrapWords } from './og-layout.mjs'

/**
 * The share card's promise: whatever the brand name and headline, everything
 * that carries meaning is inside the central square, and nothing overflows.
 * Driven twice: with a crude stand-in measurer, and with the real fonts the
 * generator draws with, in all three of the site's languages.
 */

const HEADLINES = {
  short: 'Hi',
  template: 'A short, concrete promise',
  long: 'We design, build and run cloud infrastructure and DevOps pipelines for growing companies',
  latvian: 'Mākoņu infrastruktūra, DevOps konsultācijas un atbalsts uzņēmumiem visā Latvijā',
  russian: 'Облачная инфраструктура, консультации по DevOps и поддержка для компаний по всей Латвии',
}

const BRANDS = ['Dod ar prieku', 'HA Group', 'Rīgas Būvkonsultācijas', 'Облако']

/** Every box on the card, for the containment checks. */
const boxesOf = (layout) => [layout.tile, layout.brand.box, ...layout.headline.lines.map((line) => line.box)]

const expectInsideSafeSquare = (layout) => {
  const safe = safeSquare()
  for (const box of boxesOf(layout)) {
    expect(isInside(box, safe), JSON.stringify({ box, safe })).toBe(true)
  }
}

const expectStackedWithoutOverlap = (layout) => {
  const boxes = boxesOf(layout)
  boxes.slice(1).forEach((box, index) => {
    const above = boxes[index]
    expect(box.y).toBeGreaterThanOrEqual(above.y + above.height - 1e-6)
  })
}

describe('safeSquare', () => {
  it('is the centred square of the card, less the inset', () => {
    const safe = safeSquare()
    expect(safe.width).toBe(safe.height)
    expect(safe.x + safe.width / 2).toBe(CARD.width / 2)
    expect(safe.y + safe.height / 2).toBe(CARD.height / 2)
    expect(safe.width).toBe(CARD.height - SPEC.inset * 2)
  })
})

describe('wrapWords and balancedWrap', () => {
  const byChars = (text) => text.length * 10

  it('fills each line greedily', () => {
    expect(wrapWords('aa bb cc dd', 50, byChars)).toEqual(['aa bb', 'cc dd'])
  })

  it('gives an over-long word a line of its own rather than splitting it', () => {
    expect(wrapWords('a enormousword b', 50, byChars)).toEqual(['a', 'enormousword', 'b'])
  })

  it('ignores extra whitespace and returns nothing for nothing', () => {
    expect(wrapWords('  aa   bb  ', 100, byChars)).toEqual(['aa bb'])
    expect(wrapWords('   ', 100, byChars)).toEqual([])
  })

  it('evens out the lines instead of stranding one word', () => {
    // Greedy at 150 gives "aaaa bbbb cccc" + "dd"; balanced keeps two lines of similar length.
    expect(wrapWords('aaaa bbbb cccc dd', 150, byChars)).toEqual(['aaaa bbbb cccc', 'dd'])
    const balanced = balancedWrap('aaaa bbbb cccc dd', 150, byChars)
    expect(balanced).toHaveLength(2)
    expect(Math.max(...balanced.map(byChars))).toBeLessThan(140)
  })
})

describe('layoutShareCard with a stand-in measurer', () => {
  const measure = {
    brand: (text, size) => text.length * size * 0.6,
    headline: (text, size) => text.length * size * 0.52,
  }
  const metrics = { brand: { ascent: 1, descent: 0.26 }, headline: { ascent: 0.97, descent: 0.24 } }

  it.each(Object.entries(HEADLINES))('keeps the %s headline inside the central square', (_, headline) => {
    const layout = layoutShareCard({ brand: 'Dod ar prieku', headline, measure, metrics })
    expectInsideSafeSquare(layout)
    expectStackedWithoutOverlap(layout)
    expect(layout.headline.lines.length).toBeLessThanOrEqual(SPEC.headline.maxLines)
  })

  it('centres everything on the card', () => {
    const layout = layoutShareCard({ brand: 'Dod ar prieku', headline: HEADLINES.template, measure, metrics })
    expect(layout.centreX).toBe(CARD.width / 2)
    expect(layout.tile.x + layout.tile.width / 2).toBe(CARD.width / 2)
  })

  it('draws a brand-only card when there is no headline', () => {
    const layout = layoutShareCard({ brand: 'Dod ar prieku', headline: '', measure, metrics })
    expect(layout.headline.lines).toEqual([])
    expectInsideSafeSquare(layout)
  })

  it('shrinks a long brand name rather than overflowing', () => {
    const layout = layoutShareCard({ brand: 'Brightwater Labs', headline: 'Hi', measure, metrics })
    expect(layout.brand.size).toBeLessThan(SPEC.brand.maxSize)
    expectInsideSafeSquare(layout)
  })

  it('refuses copy that cannot fit, instead of clipping it', () => {
    expect(() => layoutShareCard({ brand: 'x'.repeat(40), headline: 'Hi', measure, metrics })).toThrow(/brand name/)
    expect(() =>
      layoutShareCard({ brand: 'Dod ar prieku', headline: 'word '.repeat(80), measure, metrics }),
    ).toThrow(/headline/)
    expect(() =>
      layoutShareCard({ brand: 'Dod ar prieku', headline: 'Unbreakablesupercalifragilisticexpialidocious', measure, metrics }),
    ).toThrow(/headline/)
    expect(() => layoutShareCard({ brand: ' ', headline: 'Hi', measure, metrics })).toThrow(/brand name/)
  })

  it('refuses a stack taller than the square', () => {
    const tall = { brand: { ascent: 3, descent: 3 }, headline: metrics.headline }
    expect(() => layoutShareCard({ brand: 'Dod ar prieku', headline: HEADLINES.long, measure, metrics: tall })).toThrow(
      /tall/,
    )
  })
})

describe('layoutShareCard with the real fonts', () => {
  let measure
  let metrics

  beforeAll(async () => {
    const inter = fontsourceDir('@fontsource-variable/inter')
    const outfit = fontsourceDir('@fontsource-variable/outfit')
    const interFiles = ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'].map((subset) =>
      join(inter, `inter-${subset}-wght-normal.woff2`),
    )
    const brandStack = await loadStack(
      [join(outfit, 'outfit-latin-wght-normal.woff2'), join(outfit, 'outfit-latin-ext-wght-normal.woff2'), ...interFiles],
      700,
    )
    const headlineStack = await loadStack(interFiles, 500)
    measure = { brand: measurer(brandStack), headline: measurer(headlineStack) }
    metrics = { brand: verticalMetrics(brandStack), headline: verticalMetrics(headlineStack) }
  }, 30_000)

  it.each(Object.entries(HEADLINES))('keeps the %s headline inside the central square', (_, headline) => {
    for (const brand of BRANDS) {
      const layout = layoutShareCard({ brand, headline, measure, metrics })
      expectInsideSafeSquare(layout)
      expectStackedWithoutOverlap(layout)
    }
  })

  it('measures Latvian and Russian text, rather than falling over on it', () => {
    expect(measure.headline('Rīga', 40)).toBeGreaterThan(0)
    expect(measure.headline('Рига', 40)).toBeGreaterThan(0)
    // Linear in size: the layout relies on that to try sizes cheaply.
    expect(measure.headline('Rīga', 80)).toBeCloseTo(measure.headline('Rīga', 40) * 2, 6)
  })
})

describe('layoutPhotoCard', () => {
  const measure = { brand: (text, size) => text.length * size * 0.6 }
  const metrics = { brand: { ascent: 1, descent: 0.26 } }
  const SHAPES = { wide: [3000, 1000], tall: [800, 2400], square: [1000, 1000], tiny: [120, 90] }

  it.each(Object.entries(SHAPES))('keeps a %s photo and the brand name inside the central square', (_, [width, height]) => {
    const layout = layoutPhotoCard({ brand: 'Dod ar prieku', photo: { width, height }, measure, metrics })
    const safe = safeSquare()
    expect(isInside(layout.photo.box, safe), JSON.stringify(layout.photo.box)).toBe(true)
    expect(isInside(layout.brand.box, safe), JSON.stringify(layout.brand.box)).toBe(true)
  })

  it.each(Object.entries(SHAPES))('contains a %s photo without distorting it', (_, [width, height]) => {
    const { photo } = layoutPhotoCard({ brand: 'Dod ar prieku', photo: { width, height }, measure, metrics })
    expect(photo.box.width / photo.box.height).toBeCloseTo(width / height, 6)
    expect(photo.box.x + photo.box.width / 2).toBeCloseTo(CARD.width / 2, 6)
  })

  it('puts the brand name beneath the photo, with a gap, and centres the stack in the square', () => {
    const layout = layoutPhotoCard({ brand: 'Dod ar prieku', photo: { width: 1000, height: 1000 }, measure, metrics })
    expect(layout.brand.box.y).toBeGreaterThanOrEqual(layout.photo.box.y + layout.photo.box.height + SPEC.photo.gap - 1e-6)
    const top = layout.photo.box.y - layout.safe.y
    const bottom = layout.safe.y + layout.safe.height - (layout.brand.box.y + layout.brand.box.height)
    expect(Math.abs(top - bottom)).toBeLessThan(1)
  })

  it('keeps the shadow on the card, so nothing is cut at the edge', () => {
    const { photo } = layoutPhotoCard({ brand: 'Dod ar prieku', photo: { width: 3000, height: 1000 }, measure, metrics })
    expect(isInside(photo.shadowBox, { x: 0, y: 0, width: CARD.width, height: CARD.height })).toBe(true)
  })

  it('shrinks a long brand name rather than overflowing, and refuses one that cannot fit', () => {
    const layout = layoutPhotoCard({ brand: 'Brightwater Labs Group', photo: { width: 1000, height: 1000 }, measure, metrics })
    expect(layout.brand.size).toBeLessThan(SPEC.photo.brand.maxSize)
    expect(() => layoutPhotoCard({ brand: 'x'.repeat(60), photo: { width: 1, height: 1 }, measure, metrics })).toThrow(/brand name/)
    expect(() => layoutPhotoCard({ brand: ' ', photo: { width: 1, height: 1 }, measure, metrics })).toThrow(/brand name/)
  })

  it('refuses a photo with no size', () => {
    expect(() => layoutPhotoCard({ brand: 'Dod ar prieku', photo: { width: 0, height: 10 }, measure, metrics })).toThrow(/photo/)
  })
})
