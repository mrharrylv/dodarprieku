import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'
import { describe, it, expect } from 'vitest'

import { ICONS, ICO_SIZES } from './lib/brand-images.mjs'
import { readIcoDirectory } from './lib/ico.mjs'
import { BUDGET } from './lib/share-card.mjs'

/**
 * The COMMITTED output of `npm run images`. The generator is only run by
 * hand, so this is what notices that someone added an icon to the manifest
 * without generating it, or replaced a PNG with one that has transparency.
 */
const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
const file = (name) => join(PUBLIC_DIR, name)

describe('the generated icons in public/', () => {
  it.each(ICONS.map((icon) => [icon.file, icon.size]))('%s is %ipx square and opaque', async (name, size) => {
    const image = sharp(file(name))
    const { width, height, format } = await image.metadata()
    expect(format).toBe('png')
    expect([width, height]).toEqual([size, size])
    expect((await image.stats()).isOpaque).toBe(true)
  })

  it('favicon.ico holds 16, 32 and 48 px PNGs, each opaque', async () => {
    const ico = readFileSync(file('favicon.ico'))
    const directory = readIcoDirectory(ico)
    expect(directory.map((entry) => entry.width)).toEqual([...ICO_SIZES])
    for (const entry of directory) {
      const png = ico.subarray(entry.offset, entry.offset + entry.bytes)
      const { width } = await sharp(png).metadata()
      expect(width).toBe(entry.width)
      expect((await sharp(png).stats()).isOpaque).toBe(true)
    }
  })

  it('og-image.png is a 1200x630 opaque PNG', async () => {
    const image = sharp(file('og-image.png'))
    const { width, height, format } = await image.metadata()
    expect([format, width, height]).toEqual(['png', 1200, 630])
    expect((await image.stats()).isOpaque).toBe(true)
  })

  it('og-image.png is under the size target, so WhatsApp (which drops previews over 300 KB) shows it', () => {
    expect(readFileSync(file('og-image.png')).length).toBeLessThanOrEqual(BUDGET.target)
  })
})

describe('the placeholder favicon', () => {
  const svg = readFileSync(file('favicon.svg'), 'utf8')
  const site = readFileSync(join(PUBLIC_DIR, '..', 'src', 'config', 'site.ts'), 'utf8')
  const brand = site.match(/export const SITE = \{[\s\S]*?name:\s*'([^']+)'/)?.[1] ?? ''

  it.runIf(svg.includes('data-placeholder="true"'))('is labelled with the brand name and drawn as a path, not text', () => {
    expect(svg).toContain(`aria-label="${brand}"`)
    expect(svg).toContain('<path')
    expect(svg).not.toContain('<text')
  })
})

describe('site.webmanifest', () => {
  const manifest = JSON.parse(readFileSync(file('site.webmanifest'), 'utf8'))

  it('points only at files that exist', () => {
    for (const icon of manifest.icons) {
      expect(existsSync(file(icon.src.replace(/^\//, ''))), icon.src).toBe(true)
    }
  })

  it('offers a maskable icon, and keeps it apart from the "any" icons', () => {
    const maskable = manifest.icons.filter((icon) => icon.purpose === 'maskable')
    expect(maskable.map((icon) => icon.src)).toEqual(['/icon-maskable-512.png'])
    // "any maskable" on one icon makes the launcher crop a logo that was not drawn for it.
    expect(manifest.icons.some((icon) => /any/.test(icon.purpose ?? '') && /maskable/.test(icon.purpose ?? ''))).toBe(
      false,
    )
  })
})
