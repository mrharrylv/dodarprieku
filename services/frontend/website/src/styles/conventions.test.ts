import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

import { DEFAULT_LOCALE } from '@/config/site'
import { NAMESPACES, resources } from '@/i18n'

/**
 * The rules a style folder has to follow that a rendering test cannot see.
 *
 * `styles.test.tsx` renders each style and checks what it PRODUCES. This one
 * reads what it is WRITTEN as, and catches the four defects that survive a
 * render:
 *
 *  - a translation key that does not exist. React renders the key itself, so
 *    the page shows `hero.taglineX` in every language and nothing throws. In a
 *    test that only asserts on the heading, it passes.
 *  - a hardcoded colour, which skips the semantic tokens a re-theme changes.
 *  - a `dark:` variant or a dark token block: the site is light only.
 *  - an em dash, which is invisible in a diff and which this project does not
 *    use anywhere a person reads, source comments included.
 */

const STYLES_DIR = join(__dirname)

const LOCALE: Record<string, unknown> = resources[DEFAULT_LOCALE]

/** Every `<namespace>:<dotted.key>` that actually exists in the default language. */
const KNOWN_KEYS: ReadonlySet<string> = new Set(
  NAMESPACES.flatMap((ns) => {
    const walk = (value: unknown, path = ''): string[] => {
      if (typeof value !== 'object' || value === null) return [`${ns}:${path}`]
      return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
        walk(child, path ? `${path}.${key}` : key),
      )
    }
    return walk(LOCALE[ns])
  }),
)

const REQUIRED = [
  'style.ts',
  'Shell.tsx',
  'tokens.css',
  'README.md',
] as const

const STYLE_IDS = readdirSync(STYLES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(STYLES_DIR, entry.name, 'style.ts')))
  .map((entry) => entry.name)
  .sort()

const filesIn = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    return statSync(path).isDirectory() ? filesIn(path) : [path]
  })

interface Source {
  readonly name: string
  readonly text: string
  readonly lines: readonly string[]
}

const sourcesOf = (id: string): Source[] =>
  filesIn(join(STYLES_DIR, id))
    .filter((path) => /\.(tsx?|css|md)$/.test(path))
    .map((path) => {
      const text = readFileSync(path, 'utf8')
      return { name: path.slice(STYLES_DIR.length + 1), text, lines: text.split('\n') }
    })

/** `t('a.b')`, `ts('items.x.title')`, and the `i18nKey` of a <Trans>. */
const KEY_CALL = /\bt[a-zA-Z]?\(\s*['"]([a-zA-Z0-9_.]+)['"]|i18nKey=["']([a-zA-Z0-9_.]+)["']/g
const NAMESPACE_CALL = /useTranslation\(\s*['"]([a-z]+)['"]\s*\)/g

describe('every style folder', () => {
  it('there is at least one', () => {
    expect(STYLE_IDS.length).toBeGreaterThan(0)
  })

  it('every directory here is a real style', () => {
    // Everything that discovers styles, the registry, the Vite plugin, the
    // tests below, filters on style.ts. So a folder WITHOUT one is not a
    // broken style, it is an invisible one: it fails nothing, appears in no
    // list, and is silently left out of the build. Two styles were integrated
    // incompletely exactly this way and passed 967 tests by being absent.
    const orphans = readdirSync(STYLES_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => !existsSync(join(STYLES_DIR, name, 'style.ts')))

    expect(orphans, 'a folder under src/styles with no style.ts is skipped by everything').toEqual([])
  })
})

describe.each(STYLE_IDS)('style "%s"', (id) => {
  const dir = join(STYLES_DIR, id)
  const sources = sourcesOf(id)

  it('has every file the contract requires', () => {
    const missing = REQUIRED.filter((file) => !existsSync(join(dir, file)))
    expect(missing, `src/styles/${id} is missing files`).toEqual([])
  })

  it('declares an id equal to its folder name', () => {
    // A mismatch makes site.config.json's value unfindable and the error
    // message misleading.
    expect(readFileSync(join(dir, 'style.ts'), 'utf8')).toContain(`id: '${id}'`)
  })

  it('uses only translation keys that exist', () => {
    const unknown: string[] = []

    for (const source of sources) {
      if (!/\.tsx?$/.test(source.name)) continue

      const namespaces = [...source.text.matchAll(NAMESPACE_CALL)].map((match) => match[1] ?? '')
      if (namespaces.length === 0) continue

      source.lines.forEach((line, index) => {
        for (const match of line.matchAll(KEY_CALL)) {
          const key = match[1] ?? match[2] ?? ''
          // A template literal key is resolved at runtime from data; the
          // parity test covers those.
          if (key === '' || key.includes('${')) continue
          if (!namespaces.some((ns) => KNOWN_KEYS.has(`${ns}:${key}`))) {
            unknown.push(`${source.name}:${index + 1} ${key}`)
          }
        }
      })
    }

    // A key that does not exist renders as the key itself, in every language,
    // and throws nothing.
    expect(unknown, `${id} uses translation keys that do not exist`).toEqual([])
  })

  it('never hardcodes a colour in a component', () => {
    const offences: string[] = []

    for (const source of sources) {
      if (!/\.tsx$/.test(source.name)) continue
      source.lines.forEach((line, index) => {
        if (/#[0-9a-fA-F]{3}\b|#[0-9a-fA-F]{6}\b|\brgba?\(|\bhsla?\(/.test(line)) {
          offences.push(`${source.name}:${index + 1} ${line.trim().slice(0, 70)}`)
        }
      })
    }

    // A literal colour is one a re-theme cannot reach.
    expect(offences, `${id} should use semantic tokens, not literal colours`).toEqual([])
  })

  it('has no dark mode: no dark: variant and no dark token block', () => {
    const offences = sources.flatMap((source) =>
      source.lines
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => /\bdark:|data-theme/.test(line))
        .map(({ line, index }) => `${source.name}:${index + 1} ${line.trim().slice(0, 70)}`),
    )

    expect(offences, `${id} still themes for dark; the site is light only`).toEqual([])
  })

  it('contains no em dashes, comments and README included', () => {
    const offences = sources.flatMap((source) =>
      source.lines
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => line.includes('—'))
        .map(({ line, index }) => `${source.name}:${index + 1} ${line.trim().slice(0, 70)}`),
    )

    expect(offences, `${id} uses an em dash`).toEqual([])
  })

  it('keeps every file under the size ceiling', () => {
    const tooLong = sources
      .filter((source) => /\.tsx?$/.test(source.name))
      .filter((source) => source.lines.length > 400)
      .map((source) => `${source.name}: ${source.lines.length} lines`)

    // The architecture doc's ceiling. Split into sub-components in the same
    // folder instead.
    expect(tooLong, `${id} has a file that should be split`).toEqual([])
  })
})
