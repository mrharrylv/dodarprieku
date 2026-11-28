import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { DOCK_MOTION_MS } from './dock-motion'

/**
 * A static check, because jsdom runs no CSS. The dock's slide, the map's
 * zoom buttons and the timer that unmounts the dock must share one length and
 * one curve, or the close reads as several motions (or is cut off mid-slide).
 */
const read = (...path: string[]) => readFileSync(join(__dirname, ...path), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const dock = read('dock.css')
const map = read('..', 'map.css')
const theme = read('..', '..', '..', 'index.css')

describe('the dock\'s motion in CSS', () => {
  it('declares its length and its exit curve as theme tokens, the length equal to DOCK_MOTION_MS', () => {
    expect(theme).toMatch(new RegExp(`--dock-motion:\\s*${DOCK_MOTION_MS}ms;`))
    expect(theme).toMatch(/--ease-in-soft:\s*cubic-bezier\(/)
  })

  it('slides the dock with those tokens rather than numbers of its own', () => {
    expect(dock).not.toMatch(/cubic-bezier|\d+ms/)
    expect(dock).toMatch(/animation:\s*dp-dock-rise var\(--dock-motion\) var\(--ease-out-soft\)/)
    expect(dock).toMatch(/animation:\s*dp-dock-sink var\(--dock-motion\) var\(--ease-in-soft\)/)
  })

  it('moves the zoom buttons and the attribution with the dock, over its time and curve', () => {
    const rule = /\.maplibregl-ctrl-bottom-right\s*\{([^}]*)\}/.exec(map)?.[1] ?? ''
    expect(rule).toMatch(/transition:\s*right var\(--dock-motion\) var\(--dock-ease/)
  })
})
