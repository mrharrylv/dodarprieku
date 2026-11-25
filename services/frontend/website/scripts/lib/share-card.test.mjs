import { randomBytes } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sharp from 'sharp'
import { afterAll, beforeAll, describe, it, expect } from 'vitest'

import { svgDataUri } from './brand-images.mjs'
import { BUDGET, HERO_NAMES, encodeCard, findShareHero, loadShareFonts, renderShareCard } from './share-card.mjs'
import { glyphExtent } from './fonts.mjs'

const colours = { groundFrom: '#1d5fb8', groundTo: '#12396f', plate: '#f9fafb', text: '#f9fafb', flatten: '#3c8ef1' }
const logo = svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#3c8ef1"/></svg>')

let dir
let fonts

/** A transparent cut-out: a red disc with a 40px transparent margin. */
const cutout = (width, height) =>
  sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 2 - 40}" fill="#ff0000"/></svg>`,
    ),
  )
    .png()
    .toBuffer()

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'share-card-'))
  fonts = await loadShareFonts()
}, 30_000)

afterAll(() => rmSync(dir, { recursive: true, force: true }))

const input = (heroFile) => ({ sharp, brand: 'Dodar prieku', headline: 'Consulting and support', heroFile, colours, logo, fonts })

const pixel = async (png, x, y) => {
  const { data } = await sharp(png).extract({ left: x, top: y, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true })
  return [...data]
}

describe('findShareHero', () => {
  it('finds nothing in an empty folder and the first preferred name otherwise', () => {
    expect(findShareHero(dir)).toBeNull()
    writeFileSync(join(dir, 'share-hero.jpg'), 'x')
    expect(findShareHero(dir)).toBe(join(dir, 'share-hero.jpg'))
    writeFileSync(join(dir, HERO_NAMES[0]), 'x')
    expect(findShareHero(dir)).toBe(join(dir, 'share-hero.png'))
    rmSync(join(dir, 'share-hero.jpg'))
    rmSync(join(dir, 'share-hero.png'))
  })
})

describe('renderShareCard, wordmark layout', () => {
  it('draws an opaque 1200x630 PNG under the size target', async () => {
    const card = await renderShareCard(input(null))
    expect(card.mode).toBe('wordmark')
    const meta = await sharp(card.png).metadata()
    expect([meta.format, meta.width, meta.height]).toEqual(['png', 1200, 630])
    expect((await sharp(card.png).stats()).isOpaque).toBe(true)
    expect(card.png.length).toBeLessThanOrEqual(BUDGET.target)
  }, 30_000)
})

describe('renderShareCard, photo layout', () => {
  it('composites a transparent cut-out onto the ground inside the central square, opaque and in budget', async () => {
    const hero = join(dir, 'share-hero.png')
    writeFileSync(hero, await cutout(900, 700))
    const card = await renderShareCard(input(hero))
    expect(card.mode).toBe('photo')

    const meta = await sharp(card.png).metadata()
    expect([meta.format, meta.width, meta.height]).toEqual(['png', 1200, 630])
    expect((await sharp(card.png).stats()).isOpaque).toBe(true)
    expect(card.png.length).toBeLessThanOrEqual(BUDGET.limit)

    // The disc's centre is red; the transparent corner of the cut-out shows the ground, not black or white.
    const { box } = card.layout.photo
    const [r, g, b] = await pixel(card.png, Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2))
    expect(r).toBeGreaterThan(200)
    expect(g).toBeLessThan(40)
    expect(b).toBeLessThan(40)
    const [gr, gg, gb] = await pixel(card.png, Math.round(box.x + 4), Math.round(box.y + 4))
    expect(gb).toBeGreaterThan(gr)
    // Nothing is drawn left or right of the central square except the ground.
    const [lr, lg, lb] = await pixel(card.png, 10, 315)
    expect(lb).toBeGreaterThan(lr)
    expect([lr, lg, lb]).not.toEqual([255, 0, 0])
  }, 30_000)

  it('contains a tall opaque JPEG-sized photo without cropping it', async () => {
    const hero = join(dir, 'share-hero.png')
    writeFileSync(hero, await sharp({ create: { width: 600, height: 1800, channels: 3, background: '#00ff00' } }).png().toBuffer())
    const card = await renderShareCard(input(hero))
    const { box } = card.layout.photo
    expect(box.height / box.width).toBeCloseTo(3, 4)
    const [r, g] = await pixel(card.png, Math.round(box.x + box.width / 2), Math.round(box.y + box.height - 3))
    expect(g).toBeGreaterThan(200)
    expect(r).toBeLessThan(60)
  }, 30_000)
})

describe('encodeCard', () => {
  it('refuses a card over the hard limit, and says what to change', async () => {
    // Per-pixel noise cannot be compressed below the limit.
    const noise = randomBytes(1200 * 630 * 3)
    const png = await sharp(noise, { raw: { width: 1200, height: 630, channels: 3 } }).png().toBuffer()
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><image href="data:image/png;base64,${png.toString('base64')}" width="1200" height="630"/></svg>`
    await expect(encodeCard(sharp, svg, '#ffffff')).rejects.toThrow(/WhatsApp drops previews over 300 KB/)
  }, 60_000)
})

describe('glyphExtent', () => {
  it('measures a capital between the baseline and its cap height', () => {
    const { minY, maxY } = glyphExtent(fonts.brand, 'S')
    expect(maxY).toBeGreaterThan(0.6)
    expect(maxY).toBeLessThan(0.9)
    expect(Math.abs(minY)).toBeLessThan(0.05)
  })
})
