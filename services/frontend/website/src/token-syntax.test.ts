import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

/**
 * How a component refers to a design token.
 *
 * Tailwind 4 spells the CSS-variable shorthand with PARENTHESES:
 *
 *   bg-(--surface-page)     ->  background-color: var(--surface-page)   correct
 *   bg-[--surface-page]     ->  background-color: --surface-page        dropped
 *
 * The bracket form is Tailwind 3's. Under 4 it is read as an arbitrary
 * LITERAL, so the generated declaration has a bare custom-property name where
 * a value should be, every browser discards it, and the element renders with
 * no background at all.
 *
 * Nothing else catches this. It compiles, it lints, it type-checks, the class
 * appears in the stylesheet, jsdom has no layout so every component test still
 * passes, and the only symptom is a site that looks unstyled. This template
 * carried 1384 of them across 137 files, every colour, radius, shadow, font
 * and size on every page, until a build's CSS was read by hand.
 *
 * So: read the source instead, and fail on the shape rather than the effect.
 */

const SRC = __dirname

/** `bg-[--x]`, `text-[length:--x]`, `font-[family-name:--x]`. */
const BRACKET_TOKEN = /-\[((?:[a-z-]+:)?--[A-Za-z0-9-]+)\]/g

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(entry) ? [path] : []
  })

describe('design token syntax', () => {
  it('uses the Tailwind 4 parenthesis form everywhere', () => {
    const offences: string[] = []

    for (const path of sourceFiles(SRC)) {
      // This file quotes both forms on purpose, to document the difference.
      if (path.endsWith('token-syntax.test.ts')) continue

      readFileSync(path, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          for (const match of line.matchAll(BRACKET_TOKEN)) {
            offences.push(
              `${path.slice(SRC.length + 1)}:${index + 1} ${match[0]} should be -(${match[1]})`,
            )
          }
        })
    }

    expect(
      offences,
      'the bracket form compiles to a bare custom-property name and the browser drops the declaration',
    ).toEqual([])
  })

  it('still uses tokens rather than literal values', () => {
    // The opposite failure: someone "fixes" a dropped declaration by writing
    // the colour in directly, which works in one theme and not the other.
    const count = sourceFiles(SRC)
      .filter((path) => !path.endsWith('.test.ts') && !path.endsWith('.test.tsx'))
      .reduce(
        (total, path) =>
          total + [...readFileSync(path, 'utf8').matchAll(/-\((?:[a-z-]+:)?--[A-Za-z0-9-]+\)/g)].length,
        0,
      )

    expect(count).toBeGreaterThan(500)
  })
})
