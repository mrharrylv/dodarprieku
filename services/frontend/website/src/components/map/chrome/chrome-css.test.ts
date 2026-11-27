import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * A static check, because jsdom has no layout. An animation that fills
 * forwards keeps its transform after it ends, and an element with a transform
 * is the containing block of its absolute descendants: the compact category
 * menu then hung from its own wrapper and ran under the dock (MAP-07).
 */
const css = readFileSync(join(__dirname, 'chrome.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('chrome.css', () => {
  it('leaves no transform behind on the parts that rise in', () => {
    const rule = /\.dp-chrome-in\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
    expect(rule).toMatch(/animation:/)
    expect(rule).not.toMatch(/\b(both|forwards)\b/)
  })
})
