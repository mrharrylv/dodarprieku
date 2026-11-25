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
 *  - a hardcoded colour, which looks right in whichever theme it was written
 *    in and wrong in the other.
 *  - a `dark:` variant on anything but a decorative fill, which means a
 *    semantic token was skipped, and the two themes now have to be maintained
 *    separately in that component's markup.
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

/** The semantic tokens whose value differs between the two themes. */
const COLOUR_TOKEN = /^(surface|border|text|fill|ring)-/

const REQUIRED = [
  'style.ts',
  'Shell.tsx',
  'AboutPage.tsx',
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

    // A literal colour is correct in one theme and wrong in the other.
    expect(offences, `${id} should use semantic tokens, not literal colours`).toEqual([])
  })

  it('reaches past the semantic layer only for a decorative fill', () => {
    const offences: string[] = []

    for (const source of sources) {
      if (!/\.tsx$/.test(source.name)) continue

      source.lines.forEach((line, index) => {
        if (!/\bdark:/.test(line)) return

        // `dark:` on TEXT is always wrong: --text-* already answers both
        // themes, and a component that overrides it has to be re-checked for
        // contrast by hand, which nobody does.
        if (/\bdark:text-/.test(line)) {
          offences.push(`${source.name}:${index + 1} dark: on text, use a --text-* token`)
          return
        }

        // Otherwise it is allowed only on a decorative element, where both
        // themes are being stated deliberately. doc/design.md sanctions
        // exactly this case and no other: the hero's gradient wash.
        // `aria-hidden` usually sits a line or two above the className, so
        // look back to the start of the JSX element.
        const start = Math.max(0, index - 8)
        const element = source.lines.slice(start, index + 1).join(' ')
        const opening = element.lastIndexOf('<')
        const scope = opening === -1 ? element : element.slice(opening)

        if (!/aria-hidden/.test(scope)) {
          offences.push(
            `${source.name}:${index + 1} dark: on a non-decorative element, use a semantic token`,
          )
        }
      })
    }

    expect(offences, `${id} reached past the semantic layer`).toEqual([])
  })

  it('states both themes whenever it repoints a colour', () => {
    const css = readFileSync(join(dir, 'tokens.css'), 'utf8')

    const declared = (selector: string): string[] => {
      const body = css.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`, 'm'))?.[1] ?? ''
      return [...body.matchAll(/--([\w-]+)\s*:/g)]
        .map((match) => match[1] ?? '')
        .filter((name) => COLOUR_TOKEN.test(name))
    }

    const light = declared(':root')
    const dark = new Set(declared("\\[data-theme='dark'\\]"))
    const unanswered = light.filter((name) => !dark.has(name))

    // A style's tokens.css is imported into layer(components); index.css
    // defines both themes in @layer base. Layer order beats specificity, so an
    // unqualified :root here overrides the base stylesheet's
    // [data-theme='dark'] block as well as its :root. A style that repoints a
    // colour for light and says nothing about dark has therefore repointed
    // BOTH, and the theme toggle silently stops doing anything.
    expect(
      unanswered,
      `src/styles/${id}/tokens.css repoints these for light only, which also overrides the dark theme`,
    ).toEqual([])
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
