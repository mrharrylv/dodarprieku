#!/usr/bin/env node
/**
 * Renders every raster asset the site ships from ONE source: public/favicon.svg.
 *
 *   npm run images
 *
 * Writes, into public/:
 *   favicon.ico                  16, 32 and 48 px, PNG-in-ICO: what crawlers request by name
 *   favicon-96x96.png            the PNG favicon Google prefers (a multiple of 48 px)
 *   apple-touch-icon.png         180 px, for iOS home screens
 *   icon-192.png, icon-512.png   the manifest's icons
 *   icon-maskable-512.png        the manifest's Android adaptive icon
 *   logo.png                     512 px, the Organization logo in the structured data
 *   og-image.png                 1200x630 share card, all inside the central square
 *                                (see lib/og-layout.mjs): the logo, brand name and
 *                                headline, or, when assets-src/share-hero.(png|jpg|webp)
 *                                exists, that photo with the brand name beneath it.
 *                                Kept under 200 KB (WhatsApp drops previews over 300 KB).
 *
 * Every icon is opaque, on the brand ground. The brand name and headline are
 * drawn as paths from the self-hosted font files (lib/fonts.mjs), so the card
 * does not change with the fonts installed on the machine that runs this.
 *
 * While public/favicon.svg still carries data-placeholder="true", it is redrawn
 * as the brand name's first letter on the brand colour. A real logo is left alone.
 *
 * It also keeps the literal hex values that cannot read a CSS variable in step
 * with --brand-hue in src/index.css: the placeholder favicon's fill (only while
 * it still carries data-placeholder="true"), the manifest's theme and
 * background colours, and index.html's two theme-color metas.
 *
 * Re-run it after replacing favicon.svg with the real logo, changing the brand
 * name, the brand hue, or map.json's share.headline. It fails, rather than
 * writing a clipped card, when the brand name or headline cannot fit.
 *
 * Needs `sharp`, `fontkit` and `wawoff2` (devDependencies). None of them ships
 * in the site's bundle.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { gamutMap, toHex } from './lib/oklch.mjs'
import { encodeIco, readIcoDirectory } from './lib/ico.mjs'
import { glyphExtent, textMarkup } from './lib/fonts.mjs'
import { ICONS, ICO_PADDING, ICO_SIZES, faviconSvg, firstLetter, iconSvg, svgDataUri } from './lib/brand-images.mjs'
import { BUDGET, findShareHero, loadShareFonts, renderShareCard } from './lib/share-card.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const PUBLIC_DIR = join(ROOT, 'public')
const ASSETS_DIR = join(ROOT, 'assets-src')

let sharp
try {
  sharp = (await import('sharp')).default
} catch {
  console.error('sharp is not installed. Run `npm install` in services/frontend/website and try again.')
  process.exit(1)
}

const read = (path) => readFileSync(join(ROOT, path), 'utf8')

// --- what the site says about itself ---------------------------------------

const cssToken = (css, name) => {
  const match = css.match(new RegExp(`--${name}:\\s*oklch\\(\\s*([\\d.]+)\\s+([\\d.]+)\\s+`))
  if (match === null) throw new Error(`--${name} not found in src/index.css`)
  return { L: Number(match[1]), C: Number(match[2]) }
}

const css = read('src/index.css')
const hue = Number(css.match(/--brand-hue:\s*([\d.]+)/)?.[1] ?? NaN)
if (!Number.isFinite(hue)) throw new Error('--brand-hue not found in src/index.css')

const hex = (name) => {
  const { L, C } = cssToken(css, name)
  return toHex(gamutMap(L, C, hue))
}

const BRAND = hex('color-brand-500')
const LIGHT = hex('color-ink-50')
const DARK = hex('color-ink-950')

const site = read('src/config/site.ts')
// The card shows the logo, so it carries the wordmark (`SITE.wordmark`, lowercase by design) when there is one.
const siteBlock = site.match(/export const SITE = \{[\s\S]*?\n\}/)?.[0] ?? ''
const brandName = siteBlock.match(/wordmark:\s*'([^']+)'/)?.[1] ?? siteBlock.match(/name:\s*'([^']+)'/)?.[1] ?? 'Site'
const defaultLocale = site.match(/export const DEFAULT_LOCALE[^=]*=\s*'([^']+)'/)?.[1] ?? 'en'
const map = JSON.parse(read(`src/i18n/locales/${defaultLocale}/map.json`))
const headline = map?.share?.headline ?? ''

// --- keep the literal hexes honest -------------------------------------------

const patch = (path, replacer) => {
  const before = read(path)
  const after = replacer(before)
  if (after !== before) {
    writeFileSync(join(ROOT, path), after)
    console.log(`  ${path.padEnd(28)} colours updated`)
  }
}

const fonts = await loadShareFonts()

/**
 * The placeholder favicon is the brand name's first letter, drawn from the
 * brand font. Only while it still carries data-placeholder="true": a real
 * logo is never touched.
 */
const placeholderLetter = () => {
  const letter = [firstLetter(brandName), '•'].find((char) => {
    try {
      glyphExtent(fonts.brand, char)
      return true
    } catch {
      return false
    }
  })
  const size = 38
  const { minY, maxY } = glyphExtent(fonts.brand, letter)
  return textMarkup(fonts.brand, letter, { size, x: 32, y: 32 + ((minY + maxY) / 2) * size, fill: '#ffffff' })
}

patch('public/favicon.svg', (svg) =>
  svg.includes('data-placeholder="true"')
    ? faviconSvg({ brand: brandName, ground: BRAND, letterMarkup: placeholderLetter() })
    : svg,
)
patch('public/site.webmanifest', (json) =>
  json
    .replace(/"theme_color":\s*"#[0-9a-fA-F]{6}"/, `"theme_color": "${BRAND}"`)
    .replace(/"background_color":\s*"#[0-9a-fA-F]{6}"/, `"background_color": "${LIGHT}"`),
)
patch('index.html', (html) =>
  html
    .replace(/(media="\(prefers-color-scheme: light\)" content=")#[0-9a-fA-F]{6}/, `$1${LIGHT}`)
    .replace(/(media="\(prefers-color-scheme: dark\)" content=")#[0-9a-fA-F]{6}/, `$1${DARK}`),
)

// --- the rasters --------------------------------------------------------------

const logo = svgDataUri(read('public/favicon.svg'))

/**
 * `flatten` onto the brand colour is the guarantee behind "every icon is
 * opaque": whatever a replacement logo does at its edges, no pixel of the
 * output keeps an alpha channel.
 */
const render = (svg, width, height) =>
  sharp(Buffer.from(svg), { density: 144 })
    .resize(width, height)
    .flatten({ background: BRAND })
    .png({ compressionLevel: 9 })
    .toBuffer()

const write = (name, buffer, label) => {
  writeFileSync(join(PUBLIC_DIR, name), buffer)
  console.log(`  ${name.padEnd(28)} ${label.padEnd(12)} ${(buffer.length / 1024).toFixed(1)} KB`)
}

mkdirSync(PUBLIC_DIR, { recursive: true })

for (const { file, size, padding } of ICONS) {
  write(file, await render(iconSvg({ size, padding, ground: BRAND, logo }), size, size), `${size}x${size}`)
}

const icoEntries = await Promise.all(
  ICO_SIZES.map(async (size) => ({
    size,
    png: await render(iconSvg({ size, padding: ICO_PADDING, ground: BRAND, logo }), size, size),
  })),
)
const ico = encodeIco(icoEntries)
write('favicon.ico', ico, readIcoDirectory(ico).map((entry) => entry.width).join('/'))

// --- the share card -------------------------------------------------------------

const heroFile = findShareHero(ASSETS_DIR)
const card = await renderShareCard({
  sharp,
  brand: brandName,
  headline,
  heroFile,
  colours: {
    groundFrom: hex('color-brand-600'),
    groundTo: hex('color-brand-800'),
    plate: LIGHT,
    text: LIGHT,
    flatten: BRAND,
  },
  logo,
  fonts,
})
write('og-image.png', card.png, `1200x630`)

console.log(
  card.mode === 'photo'
    ? `\nDone. Brand ${BRAND} at hue ${hue}. Share card: photo layout from ${heroFile.split('/').pop()}, ` +
        `"${brandName}" at ${card.layout.brand.size}px.`
    : `\nDone. Brand ${BRAND} at hue ${hue}. Share card: "${brandName}" at ${card.layout.brand.size}px, ` +
        `headline in ${card.layout.headline.lines.length} line(s) at ${card.layout.headline.size}px.`,
)
console.log(
  `og-image.png: ${(card.png.length / 1024).toFixed(1)} KB (${card.encoding}), ` +
    `target ${BUDGET.target / 1024} KB, WhatsApp limit ${BUDGET.limit / 1024} KB.`,
)
