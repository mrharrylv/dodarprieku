import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { CATEGORIES } from '@shared/catalog'
import { contrast, gamutMap, WHITE } from '@/test/color'

const CSS = readFileSync(join(__dirname, 'category-tones.css'), 'utf8')

/** `--pin-<tone>: oklch(L C h)` out of the stylesheet, as the browser would render it. */
const pinFill = (tone: string) => {
  const m = new RegExp(`--pin-${tone}:\\s*oklch\\(([\\d.]+) ([\\d.]+) ([\\d.]+)\\)`).exec(CSS)
  if (m === null) throw new Error(`--pin-${tone} is missing or not oklch(L C h)`)
  return { L: Number(m[1]), C: Number(m[2]), rgb: gamutMap(Number(m[1]), Number(m[2]), Number(m[3])) }
}

describe('category tones', () => {
  it('every category tone has a pin and a badge fill', () => {
    for (const { tone } of CATEGORIES) {
      expect(CSS).toContain(`--pin-${tone}:`)
      expect(CSS).toContain(`--cat-${tone}: var(--pin-${tone})`)
    }
  })

  it('a white icon clears 4.5:1 on every fill', () => {
    const fails = CATEGORIES.map(({ tone }) => [tone, contrast(WHITE, pinFill(tone).rgb)] as const).filter(([, r]) => r < 4.5)
    expect(fails).toEqual([])
  })

  it('"Cita organizācija" is visibly coloured, so it never reads as a greyed-out pin', () => {
    const tone = CATEGORIES.find((c) => c.id === 'cits')?.tone
    expect(tone).toBe('brown')
    expect(pinFill('brown').C).toBeGreaterThanOrEqual(0.06)
  })
})
