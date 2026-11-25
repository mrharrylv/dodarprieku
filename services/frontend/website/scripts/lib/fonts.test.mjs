import { join } from 'node:path'

import { beforeAll, describe, it, expect } from 'vitest'

import { fontsourceDir, loadStack, measurer, runsOf, textMarkup, verticalMetrics } from './fonts.mjs'

describe('text drawn from the self-hosted fonts', () => {
  let stack

  beforeAll(async () => {
    const inter = fontsourceDir('@fontsource-variable/inter')
    stack = await loadStack(
      ['latin', 'latin-ext', 'cyrillic'].map((subset) => join(inter, `inter-${subset}-wght-normal.woff2`)),
      500,
    )
  }, 30_000)

  it('splits text into runs by the font that can draw it', () => {
    const runs = runsOf(stack, 'Rīga Рига')
    // "R" latin, "ī" latin-ext, "ga " latin, "Рига" cyrillic.
    expect(runs.map((run) => run.text)).toEqual(['R', 'ī', 'ga ', 'Рига'])
    expect(runs.map((run) => stack.indexOf(run.font))).toEqual([0, 1, 0, 2])
  })

  it('names the character when no font in the stack can draw it', () => {
    expect(() => runsOf(stack, 'Tokyo 東京')).toThrow(/U\+6771/)
  })

  it('draws paths, never <text>, so the machine that renders it cannot swap the font', () => {
    const markup = textMarkup(stack, 'Rīga', { size: 40, x: 600, y: 300, fill: '#ffffff' })
    expect(markup).toContain('<path d="M')
    expect(markup).not.toContain('<text')
    expect(markup).toContain('fill="#ffffff"')
  })

  it('centres the line on x', () => {
    const width = measurer(stack)('Rīga', 40)
    const markup = textMarkup(stack, 'Rīga', { size: 40, x: 600, y: 300, fill: '#fff' })
    const firstX = Number(markup.match(/translate\(([\d.]+) /)?.[1])
    expect(firstX).toBeCloseTo(600 - width / 2, 1)
  })

  it('reports vertical metrics as fractions of the size', () => {
    const { ascent, descent } = verticalMetrics(stack)
    expect(ascent).toBeGreaterThan(0.7)
    expect(ascent).toBeLessThan(1.2)
    expect(descent).toBeGreaterThan(0.1)
    expect(descent).toBeLessThan(0.4)
  })

  it('refuses an empty stack', async () => {
    await expect(loadStack([], 400)).rejects.toThrow(/no font files/)
  })
})
