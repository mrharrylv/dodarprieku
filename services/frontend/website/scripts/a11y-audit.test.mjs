import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { pagePaths } from './a11y-audit.mjs'

const write = (root, file) => {
  const path = join(root, file)
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, '<!doctype html>')
}

describe('pagePaths', () => {
  it('lists every prerendered page by its URL, root first, and skips assets', () => {
    const dist = mkdtempSync(join(tmpdir(), 'a11y-'))
    for (const file of ['index.html', 'lv/index.html', 'lv/legal/privacy/index.html', 'en/index.html', 'assets/index.html', '404.html', 'robots.txt']) {
      write(dist, file)
    }
    expect(pagePaths(dist)).toEqual(['/', '/en', '/lv', '/lv/legal/privacy'])
  })
})
