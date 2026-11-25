import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

/**
 * Nothing may make the page scroll sideways on a phone.
 *
 * `html, body { overflow-x: clip }` in index.css stops the SYMPTOM, but an
 * element wider than the viewport under a clip is worse than a scrollbar: the
 * content is simply unreachable, silently, on the one device most visitors
 * use. So the causes are caught here instead.
 *
 * A static check, because the real one needs a layout engine and jsdom has
 * none. It reads the class strings a style ships and rejects the three things
 * that actually cause it: a fixed width wider than the narrowest phone, a
 * minimum width that cannot shrink, and `w-screen`, which is the viewport
 * INCLUDING the scrollbar gutter and therefore overflows by 15px on a desktop
 * that has one.
 *
 * 320px is the floor: an iPhone SE in portrait, and the width WCAG 1.4.10
 * reflow is measured at.
 */

const MIN_VIEWPORT_PX = 320
const ROOT = join(__dirname, '..')

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(tsx|ts|css)$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : []
  })

/** Tailwind arbitrary lengths, in px. `rem` at the 16px root. */
const toPx = (value: string): number | null => {
  const match = value.match(/^([\d.]+)(px|rem|em)$/)
  if (match === null) return null
  const size = Number(match[1])
  return match[2] === 'px' ? size : size * 16
}

interface Offence {
  readonly file: string
  readonly line: number
  readonly text: string
  readonly why: string
}

const inspect = (path: string): Offence[] => {
  const relative = path.slice(ROOT.length + 1)
  const offences: Offence[] = []

  readFileSync(path, 'utf8')
    .split('\n')
    .forEach((line, index) => {
      const record = (text: string, why: string) =>
        offences.push({ file: relative, line: index + 1, text, why })

      // `w-screen` is 100vw, which includes the scrollbar gutter.
      for (const match of line.matchAll(/\bw-screen\b/g)) {
        record(match[0], 'w-screen is 100vw and overflows by the scrollbar width; use w-full')
      }
      for (const match of line.matchAll(/\bwidth:\s*100vw\b/g)) {
        record(match[0], '100vw includes the scrollbar gutter; use 100%')
      }

      // A minimum width cannot shrink, so anything above the floor overflows.
      for (const match of line.matchAll(/\bmin-w-\[([^\]]+)\]/g)) {
        const px = toPx(match[1] ?? '')
        if (px !== null && px > MIN_VIEWPORT_PX) {
          record(match[0], `a minimum width of ${px}px cannot shrink below ${MIN_VIEWPORT_PX}px`)
        }
      }

      // A fixed width is fine only if it is also told to cap at the container.
      for (const match of line.matchAll(/(?<![\w-])w-\[([^\]]+)\]/g)) {
        const px = toPx(match[1] ?? '')
        if (px !== null && px > MIN_VIEWPORT_PX && !line.includes('max-w-full')) {
          record(match[0], `a fixed ${px}px width needs max-w-full beside it`)
        }
      }
    })

  return offences
}

const FOLDERS = readdirSync(join(ROOT, 'styles'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()

describe.each(FOLDERS)('style "%s"', (id) => {
  it('cannot make the page scroll sideways on a 320px screen', () => {
    const offences = sourceFiles(join(ROOT, 'styles', id)).flatMap(inspect)

    expect(
      offences.map((o) => `${o.file}:${o.line} "${o.text}": ${o.why}`),
      'fixed widths wider than the narrowest phone',
    ).toEqual([])
  })
})

describe('the shared components', () => {
  it('cannot make the page scroll sideways either', () => {
    const offences = [
      ...sourceFiles(join(ROOT, 'components')),
      ...sourceFiles(join(ROOT, 'pages')),
    ].flatMap(inspect)

    expect(offences.map((o) => `${o.file}:${o.line} "${o.text}": ${o.why}`)).toEqual([])
  })
})

describe('the base stylesheet', () => {
  const css = readFileSync(join(ROOT, 'index.css'), 'utf8')

  it('clips horizontal overflow on both html and body', () => {
    // On body alone, iOS Safari still pans sideways.
    const html = css.match(/\bhtml\s*\{[^}]*\}/)?.[0] ?? ''
    const body = css.match(/\bbody\s*\{[^}]*\}/)?.[0] ?? ''

    expect(html, 'html needs overflow-x').toMatch(/overflow-x:\s*clip/)
    expect(body, 'body needs overflow-x').toMatch(/overflow-x:\s*clip/)
  })

  it('caps replaced elements at their container', () => {
    // One unconstrained image is enough to widen the whole document.
    expect(css).toMatch(/img[\s\S]{0,40}\{[^}]*max-width:\s*100%/)
  })
})
