import { describe, it, expect } from 'vitest'

import { gamutMap, toHex } from './color'
// @ts-expect-error plain ESM without types; the point of this file is to compare it with the typed one
import { gamutMap as gamutMapScript, toHex as toHexScript } from '../../scripts/lib/oklch.mjs'

/**
 * `scripts/lib/oklch.mjs` and `src/test/color.ts` must agree.
 *
 * The script writes literal hexes into the favicon, the manifest and
 * index.html; the test proves the palette's contrast. If the two conversions
 * drift, the site ships one colour and the test vouches for another, which is
 * how a violet favicon once sat next to a blue site.
 */
describe('the script-side OKLCH conversion', () => {
  const L = [0.15, 0.4, 0.55, 0.7, 0.9, 0.97]
  const C = [0, 0.02, 0.12, 0.22]
  const H = [0, 25, 150, 210, 255, 265, 350]

  it('produces the same hex as the test-side conversion, across the palette space', () => {
    const mismatches: string[] = []
    for (const l of L) {
      for (const c of C) {
        for (const h of H) {
          const expected = toHex(gamutMap(l, c, h))
          const actual = toHexScript(gamutMapScript(l, c, h)) as string
          if (expected !== actual) mismatches.push(`oklch(${l} ${c} ${h}): ${actual} vs ${expected}`)
        }
      }
    }
    expect(mismatches).toEqual([])
  })

  it('reproduces the sRGB anchors', () => {
    expect(toHexScript(gamutMapScript(1, 0, 0))).toBe('#ffffff')
    expect(toHexScript(gamutMapScript(0.628, 0.2577, 29.23))).toBe('#ff0000')
  })
})
