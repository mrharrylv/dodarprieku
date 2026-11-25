import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

import packageJson from '../../package.json'

/**
 * A style that imports a font package must have it installed.
 *
 * `make verify` builds the ACTIVE style only, so a style with a missing
 * dependency sits there passing every test until someone switches to it, and
 * then the build fails with a module-resolution stack trace that names
 * `enhanced-resolve` rather than the style. That is exactly how `editorial`
 * shipped asking for a serif nobody had installed.
 *
 * This reads every style's `tokens.css` instead, so the failure arrives with
 * the style's name and the command to fix it.
 */

const STYLES_DIR = __dirname

const DEPENDENCIES = new Set([
  ...Object.keys(packageJson.dependencies ?? {}),
  ...Object.keys(packageJson.devDependencies ?? {}),
])

const STYLE_IDS = readdirSync(STYLES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(STYLES_DIR, entry.name, 'tokens.css')))
  .map((entry) => entry.name)
  .sort()

/** `@import '@fontsource-variable/fraunces';` and friends. */
const IMPORT = /@import\s+['"]([^'"]+)['"]/g

/** `@scope/name/subpath` becomes `@scope/name`. */
const packageOf = (specifier: string): string | null => {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return null
  const parts = specifier.split('/')
  return specifier.startsWith('@') ? `${parts[0]}/${parts[1]}` : (parts[0] ?? null)
}

describe.each(STYLE_IDS)('style "%s"', (id) => {
  it('only imports packages that are installed', () => {
    const css = readFileSync(join(STYLES_DIR, id, 'tokens.css'), 'utf8')

    const missing = [...css.matchAll(IMPORT)]
      .map((match) => packageOf(match[1] ?? ''))
      .filter((name): name is string => name !== null)
      .filter((name) => !DEPENDENCIES.has(name))
      .map((name) => `${name} (run: npm install ${name})`)

    expect(missing, `src/styles/${id}/tokens.css imports a package that is not in package.json`).toEqual([])
  })
})
