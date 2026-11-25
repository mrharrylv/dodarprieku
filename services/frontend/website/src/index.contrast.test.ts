import { describe, it, expect } from 'vitest'

import { contrast, gamutMap, toHex, WHITE, type Rgb } from '@/test/color'
import { BASE_CSS, palette, styleTokenFiles } from '@/test/tokens'

/**
 * The accessibility bar, measured rather than asserted.
 *
 * `index.css` used to carry a comment saying the accent colours cleared 4.5:1.
 * They did not: white on the primary button measured 3.31:1, and accent text
 * measured 4.28:1, at the default hue. Both are the kind of claim that is easy
 * to write, impossible to eyeball, and never checked again.
 *
 * So this reads the real token values out of the CSS and computes what a
 * browser would render. It runs for the base palette AND for every style's
 * overrides, at every brand hue the docs suggest, because a palette that
 * passes at violet and fails at green is a trap for whoever re-themes next,
 * and a style that repoints `--text-muted` at a paler step is the same trap
 * one folder further down.
 *
 * WCAG 2.2: 4.5:1 for normal text (1.4.3), 3:1 for UI components and focus
 * indicators (1.4.11).
 */

const TEXT = 4.5
const UI = 3

/** Every hue offered in index.css and doc/design.md. */
const HUES = [255, 210, 150, 25, 350, 265] as const

/** The base palette, then each style laid over it. */
const LAYERS: ReadonlyArray<[string, readonly string[]]> = [
  ['base', [BASE_CSS]],
  ...styleTokenFiles().map(
    ([id, css]) => [`style "${id}"`, [BASE_CSS, css]] as [string, readonly string[]],
  ),
]

const failures = (checks: ReadonlyArray<[string, Rgb, Rgb, number]>): string[] =>
  checks
    .map(([label, fg, bg, minimum]): [string, number, number] => [label, contrast(fg, bg), minimum])
    .filter(([, ratio, minimum]) => ratio < minimum)
    .map(([label, ratio, minimum]) => `${label}: ${ratio.toFixed(2)} < ${minimum}`)

describe('light only', () => {
  it('defines no dark theme: the site is light only (Harry, 2026-11-26)', () => {
    for (const [, sources] of LAYERS) {
      for (const css of sources) expect(css).not.toMatch(/data-theme|@custom-variant dark/)
    }
  })
})

describe('the converter itself', () => {
  it('reproduces known colours, so the numbers below can be trusted', () => {
    expect(toHex(gamutMap(1, 0, 0))).toBe('#ffffff')
    expect(contrast(WHITE, [0, 0, 0])).toBeCloseTo(21, 2)
    // sRGB primaries, from the CSS Color 4 conversion.
    expect(toHex(gamutMap(0.628, 0.2577, 29.23))).toBe('#ff0000')
    expect(toHex(gamutMap(0.452, 0.3132, 264.05))).toBe('#0000ff')
  })
})

describe.each(LAYERS)('%s', (label, sources) => {
  describe.each(HUES)('at brand hue %i', (hue) => {
    const light = palette(sources, 'light', hue, label)

    it('resolves every semantic colour token it defines', () => {
      // A value the parser cannot read is a value nobody has measured.
      const tokens = [
        'surface-page',
        'surface-raised',
        'surface-sunken',
        'border-subtle',
        'border-strong',
        'text-primary',
        'text-secondary',
        'text-muted',
        'text-accent',
        'text-on-accent',
        'fill-accent',
        'fill-accent-hover',
        'ring-accent',
      ]
      for (const token of tokens) {
        expect(() => light.colour(token), `light --${token}`).not.toThrow()
      }
    })

    it('text clears 4.5:1 on every surface', () => {
      const surfaces = ['surface-page', 'surface-raised', 'surface-sunken'] as const
      const texts = ['text-primary', 'text-secondary', 'text-muted', 'text-accent'] as const

      const checks = texts.flatMap((text) =>
        surfaces.map(
          (surface): [string, Rgb, Rgb, number] => [
            `${text} on ${surface}`,
            light.colour(text),
            light.colour(surface),
            TEXT,
          ],
        ),
      )

      expect(failures(checks)).toEqual([])
    })

    it('the primary button label clears 4.5:1', () => {
      // This is the check the original palette failed, at 3.31:1.
      expect(
        failures([
          ['light: on-accent on fill', light.colour('text-on-accent'), light.colour('fill-accent'), TEXT],
          ['light: on-accent on fill-hover', light.colour('text-on-accent'), light.colour('fill-accent-hover'), TEXT],
        ]),
      ).toEqual([])
    })

    it('the button is visible against the page it sits on (3:1, WCAG 1.4.11)', () => {
      expect(
        failures([
          ['light: fill vs page', light.colour('fill-accent'), light.colour('surface-page'), UI],
        ]),
      ).toEqual([])
    })

    it('the focus ring is visible against every surface (3:1)', () => {
      const surfaces = ['surface-page', 'surface-raised', 'surface-sunken'] as const

      expect(
        failures(
          surfaces.map(
            (surface): [string, Rgb, Rgb, number] => [
              `light: ring vs ${surface}`,
              light.colour('ring-accent'),
              light.colour(surface),
              UI,
            ],
          ),
        ),
      ).toEqual([])
    })

    it('a border that carries meaning is visible (3:1)', () => {
      expect(
        failures([
          ['light: border-strong vs raised', light.colour('border-strong'), light.colour('surface-raised'), UI],
        ]),
      ).toEqual([])
    })
  })
})

describe('status colours', () => {
  const light = palette([BASE_CSS], 'light', 255)

  it('the destructive button label clears 4.5:1', () => {
    // danger-600, not danger-500: white on 500 measures 4.04:1.
    expect(contrast(WHITE, light.ramp('color-danger-600'))).toBeGreaterThanOrEqual(TEXT)
    expect(contrast(WHITE, light.ramp('color-danger-700'))).toBeGreaterThanOrEqual(TEXT)
  })

  it('error text clears 4.5:1 on light surfaces', () => {
    // Field and ContactForm render error copy in danger-600.
    const danger = light.ramp('color-danger-600')
    expect(contrast(danger, WHITE)).toBeGreaterThanOrEqual(TEXT)
    expect(contrast(danger, light.colour('surface-page'))).toBeGreaterThanOrEqual(TEXT)
  })

  it('the info alert clears 4.5:1 at every hue', () => {
    // Alert renders brand-900 on a brand-50 ground.
    for (const hue of HUES) {
      const p = palette([BASE_CSS], 'light', hue)
      expect(
        contrast(p.ramp('color-brand-900'), p.ramp('color-brand-50')),
        `info alert at hue ${hue}`,
      ).toBeGreaterThanOrEqual(TEXT)
    }
  })
})
