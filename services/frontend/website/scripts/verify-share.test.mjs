import { randomBytes } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'

import { encodeIco } from './lib/ico.mjs'
import { MAX_IMAGE_BYTES, verifyShare } from './verify-share.mjs'

/**
 * `verifyShare` against a small, correct dist/ built in a temp dir. Each test
 * breaks ONE thing and expects the guard to name it; the first expects
 * silence, so a guard that fails everything cannot pass.
 */

const ORIGIN = 'https://example.org'
const SITE = 'Acme'
const LANGS = [
  { code: 'en', og: 'en_US' },
  { code: 'lv', og: 'lv_LV' },
]

const solid = (width, height, background = '#3c8ef1', format = 'png') =>
  sharp({ create: { width, height, channels: 3, background } })[format]().toBuffer()

const pageHtml = ({ lang, path, noIndex = false, overrides = {}, drop = [] }) => {
  const url = `${ORIGIN}${path}`
  const me = LANGS.find((l) => l.code === lang)
  const metas = {
    description: 'Acme designs and builds small tools for small shops, and keeps them running for years afterwards.',
    robots: noIndex ? 'noindex, nofollow' : 'max-image-preview:large',
    'application-name': SITE,
    'apple-mobile-web-app-title': SITE,
    'og:type': 'website',
    'og:site_name': SITE,
    'og:title': `Tools for small shops · ${SITE}`,
    'og:description': 'Acme designs and builds small tools for small shops, and keeps them running for years afterwards.',
    ...(noIndex ? {} : { 'og:url': url }),
    'og:image': `${ORIGIN}/og-image.png?v=abcd1234`,
    'og:image:width': '1200',
    'og:image:height': '630',
    'og:image:alt': SITE,
    'og:image:type': 'image/png',
    'og:locale': me.og,
    'twitter:card': 'summary_large_image',
    'twitter:title': `Tools for small shops · ${SITE}`,
    'twitter:description': 'Acme designs and builds small tools for small shops, and keeps them running for years afterwards.',
    'twitter:image': `${ORIGIN}/og-image.png?v=abcd1234`,
    ...overrides,
  }
  const tags = Object.entries(metas)
    .filter(([key]) => !drop.includes(key))
    .map(([key, content]) => `<meta ${/^(og:|fb:)/.test(key) ? 'property' : 'name'}="${key}" content="${content}" data-seo />`)
  const alternates = LANGS.filter((l) => l.code !== lang && !drop.includes('og:locale:alternate')).map(
    (l) => `<meta property="og:locale:alternate" content="${l.og}" data-seo />`,
  )
  const links = noIndex
    ? []
    : [`<link rel="canonical" href="${url}" data-seo />`, ...LANGS.map((l) => `<link rel="alternate" href="${ORIGIN}/${l.code}" hreflang="${l.code}" data-seo />`)]
  return `<!doctype html>
<html lang="${lang}"><head>
<meta charset="UTF-8" />
${drop.includes('title') ? '' : `<title>${overrides.title ?? `Tools for small shops · ${SITE}`}</title>`}
${[...tags, ...alternates, ...links].join('\n')}
<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48" />
<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f9fafb" />
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#090a0d" />
</head><body><div id="root"></div></body></html>`
}

const manifest = () => ({
  name: SITE,
  short_name: SITE,
  start_url: '/',
  icons: [
    { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  ],
})

let dist

const put = (file, content) => {
  mkdirSync(dirname(join(dist, file)), { recursive: true })
  writeFileSync(join(dist, file), content)
}

const writeGoodDist = async () => {
  put('index.html', pageHtml({ lang: 'en', path: '/' }))
  put('en/index.html', pageHtml({ lang: 'en', path: '/en' }))
  put('lv/index.html', pageHtml({ lang: 'lv', path: '/lv' }))
  put('404.html', pageHtml({ lang: 'en', path: '/404', noIndex: true }))
  put('og-image.png', await solid(1200, 630))
  put('apple-touch-icon.png', await solid(180, 180))
  put('favicon-96x96.png', await solid(96, 96))
  put('icon-192.png', await solid(192, 192))
  put('icon-512.png', await solid(512, 512))
  put('favicon.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64"/></svg>')
  put('favicon.ico', encodeIco(await Promise.all([16, 32, 48].map(async (size) => ({ size, png: await solid(size, size) })))))
  put('site.webmanifest', JSON.stringify(manifest()))
}

/** Rewrites one file of the dist in place. */
const edit = (file, fn) => put(file, fn(readFileSync(join(dist, file), 'utf8')))

const run = (env = {}) => verifyShare({ distDir: dist, env })
const failing = async (needle, env) => {
  const { failures } = await run(env)
  expect(failures.some((message) => message.includes(needle)), `expected a failure naming "${needle}", got:\n${failures.join('\n')}`).toBe(true)
}

beforeEach(async () => {
  dist = mkdtempSync(join(tmpdir(), 'verify-share-'))
  await writeGoodDist()
})
afterEach(() => rmSync(dist, { recursive: true, force: true }))

describe('verifyShare on a correct build', () => {
  it('has no failures and no warnings, and counts the pages it read', async () => {
    const result = await run()
    expect(result.failures).toEqual([])
    expect(result.warnings).toEqual([])
    expect(result.pages).toBe(4)
  })

  it('keeps its size limit in step with SHARE_IMAGE.maxBytes in the site config', () => {
    const constants = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'config', 'constants.ts'), 'utf8')
    expect(constants).toContain(`maxBytes: ${MAX_IMAGE_BYTES / 1024} * 1024`)
  })
})

describe('title and description', () => {
  it('fails a missing title', async () => {
    edit('en/index.html', (html) => html.replace(/<title>.*<\/title>/, ''))
    await failing('title is missing')
  })

  it('fails a title over 60 characters', async () => {
    edit('en/index.html', (html) => html.replace(/<title>.*<\/title>/, `<title>${'x'.repeat(61)}</title>`))
    await failing('title is 61 characters')
  })

  it('fails a description under 50 or over 160 characters', async () => {
    edit('en/index.html', (html) => html.replace(/(name="description" content=")[^"]*/, '$1Too short'))
    await failing('description is 9 characters')
    edit('lv/index.html', (html) => html.replace(/(name="description" content=")[^"]*/, `$1${'y'.repeat(161)}`))
    await failing('description is 161 characters')
  })
})

describe('Open Graph and Twitter tags', () => {
  it.each(['og:title', 'og:description', 'og:type', 'og:url', 'og:site_name', 'og:locale', 'og:image:alt', 'og:image:type', 'og:image:width', 'og:image:height', 'twitter:title', 'twitter:description', 'twitter:image'])('fails a page with no %s', async (key) => {
    edit('en/index.html', (html) => html.replace(new RegExp(`<meta [^>]*="${key}" [^>]*>`), ''))
    await failing(key)
  })

  it('fails a twitter:card that is not summary_large_image', async () => {
    edit('en/index.html', (html) => html.replace('summary_large_image', 'summary'))
    await failing('twitter:card')
  })

  it('does not ask the 404 page, which is noindex, for og:url or a canonical', async () => {
    const result = await run()
    expect(result.failures.filter((f) => f.startsWith('404.html'))).toEqual([])
  })

  it('fails a page whose og:locale:alternate does not list the other languages', async () => {
    edit('en/index.html', (html) => html.replace(/<meta property="og:locale:alternate"[^>]*>/, ''))
    await failing('og:locale:alternate')
  })

  it('fails an og:locale that is not language_TERRITORY, or does not match the page language', async () => {
    edit('en/index.html', (html) => html.replace('content="en_US"', 'content="en"'))
    await failing('og:locale')
    edit('lv/index.html', (html) => html.replace('content="lv_LV"', 'content="ru_RU"'))
    await failing('does not match')
  })

  it('fails a canonical that differs from og:url', async () => {
    edit('en/index.html', (html) => html.replace('rel="canonical" href="https://example.org/en"', 'rel="canonical" href="https://example.org/en/"'))
    await failing('canonical')
  })

  it('fails a twitter:image that differs from og:image', async () => {
    edit('en/index.html', (html) => html.replace(/(name="twitter:image" content=")[^"]*/, `$1${ORIGIN}/other.png`))
    await failing('twitter:image')
  })
})

describe('the share image', () => {
  it('fails a relative og:image once an origin is configured, and only warns before', async () => {
    edit('en/index.html', (html) => html.replaceAll(`${ORIGIN}/og-image.png?v=abcd1234`, '/og-image.png?v=abcd1234'))
    const local = await run({})
    expect(local.failures.some((f) => f.includes('og:image'))).toBe(false)
    expect(local.warnings.some((w) => w.includes('og:image') && w.includes('VITE_SITE_URL'))).toBe(true)
    await failing('og:image', { VITE_SITE_URL: ORIGIN })
    await failing('og:image', { SHARE_STRICT: '1' })
  })

  it('fails an og:image served over http', async () => {
    edit('en/index.html', (html) => html.replaceAll(`${ORIGIN}/og-image.png`, 'http://example.org/og-image.png'))
    await failing('https')
  })

  it('fails an og:image that is not in dist', async () => {
    edit('en/index.html', (html) => html.replaceAll('/og-image.png', '/missing.png'))
    await failing('missing.png')
  })

  it('fails an image that is not 1200x630', async () => {
    put('og-image.png', await solid(1000, 630))
    await failing('1000x630')
  })

  it('fails an image with an alpha channel', async () => {
    put('og-image.png', await sharp({ create: { width: 1200, height: 630, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.5 } } }).png().toBuffer())
    await failing('opaque')
  })

  it('fails a format that is not PNG or JPEG', async () => {
    put('og-image.png', await solid(1200, 630, '#3c8ef1', 'webp'))
    await failing('PNG or JPEG')
  })

  it('fails an og:image:type that disagrees with the file', async () => {
    put('og-image.png', await solid(1200, 630, '#3c8ef1', 'jpeg'))
    await failing('og:image:type')
  })

  it('fails declared dimensions that disagree with the file', async () => {
    edit('en/index.html', (html) => html.replace('og:image:width" content="1200"', 'og:image:width" content="600"'))
    await failing('og:image:width')
  })

  const noise = () => sharp(randomBytes(1200 * 630 * 3), { raw: { width: 1200, height: 630, channels: 3 } })
  const useJpeg = (buffer) => {
    put('og-image.png', buffer)
    for (const page of ['index.html', 'en/index.html', 'lv/index.html', '404.html']) {
      edit(page, (html) => html.replace('og:image:type" content="image/png"', 'og:image:type" content="image/jpeg"'))
    }
  }

  it('fails an image over 300 KB', async () => {
    put('og-image.png', await noise().png().toBuffer())
    await failing('KB; WhatsApp drops previews over 300 KB')
  })

  it('warns, without failing, over 200 KB', async () => {
    // Noise JPEG size grows with quality: find one that lands between the target and the limit.
    const base = await noise().raw().toBuffer()
    const at = (quality) => sharp(base, { raw: { width: 1200, height: 630, channels: 3 } }).jpeg({ quality }).toBuffer()
    let buffer = await at(10)
    for (let quality = 10; buffer.length < 210 * 1024 && quality < 100; quality += 2) buffer = await at(quality)
    expect(buffer.length).toBeGreaterThan(200 * 1024)
    expect(buffer.length).toBeLessThan(300 * 1024)
    useJpeg(buffer)
    const { failures, warnings } = await run()
    expect(failures).toEqual([])
    expect(warnings.some((w) => w.includes('aim below 200 KB'))).toBe(true)
  })
})

describe('icons and manifest', () => {
  it('fails an apple-touch-icon that is not 180x180 or not opaque', async () => {
    put('apple-touch-icon.png', await solid(120, 120))
    await failing('apple-touch-icon')
    put('apple-touch-icon.png', await sharp({ create: { width: 180, height: 180, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer())
    await failing('opaque')
  })

  it('fails a page with no apple-touch-icon link', async () => {
    edit('en/index.html', (html) => html.replace(/<link rel="apple-touch-icon"[^>]*>/, ''))
    await failing('apple-touch-icon')
  })

  it('fails a favicon.ico without 16, 32 and 48', async () => {
    put('favicon.ico', encodeIco([{ size: 16, png: await solid(16, 16) }, { size: 32, png: await solid(32, 32) }]))
    await failing('favicon.ico')
  })

  it('fails a missing favicon.svg or favicon-96x96.png', async () => {
    rmSync(join(dist, 'favicon.svg'))
    await failing('favicon.svg')
    rmSync(join(dist, 'favicon-96x96.png'))
    await failing('favicon-96x96.png')
  })

  it('fails a manifest icon that is missing or the wrong size', async () => {
    put('icon-192.png', await solid(100, 100))
    await failing('icon-192.png')
    rmSync(join(dist, 'icon-512.png'))
    await failing('icon-512.png')
  })

  it('fails a manifest name or short_name that is not the site', async () => {
    put('site.webmanifest', JSON.stringify({ ...manifest(), name: 'Other', short_name: 'Oth' }))
    await failing('manifest name')
    await failing('manifest short_name')
  })

  it('fails a page without theme-color metas', async () => {
    edit('en/index.html', (html) => html.replaceAll(/<meta name="theme-color"[^>]*>/g, ''))
    await failing('theme-color')
  })

  it('fails a page without application-name or apple-mobile-web-app-title', async () => {
    edit('en/index.html', (html) => html.replace(/<meta name="application-name"[^>]*>/, '').replace(/<meta name="apple-mobile-web-app-title"[^>]*>/, ''))
    await failing('application-name')
    await failing('apple-mobile-web-app-title')
  })
})

describe('placeholders', () => {
  const placeholderCopy = 'Replace this with one sentence describing what the business does and who it is for. It is the line.'

  it('warns about the placeholder copy and favicon locally', async () => {
    edit('en/index.html', (html) => html.replace(/(name="description" content=")[^"]*/, `$1${placeholderCopy}`))
    put('favicon.svg', '<svg data-placeholder="true"></svg>')
    const { failures, warnings } = await run()
    expect(failures).toEqual([])
    expect(warnings.some((w) => w.includes('placeholder copy'))).toBe(true)
    expect(warnings.some((w) => w.includes('placeholder favicon'))).toBe(true)
  })

  it('fails both under SHARE_STRICT=1', async () => {
    edit('en/index.html', (html) => html.replace(/(name="description" content=")[^"]*/, `$1${placeholderCopy}`))
    put('favicon.svg', '<svg data-placeholder="true"></svg>')
    await failing('placeholder copy', { SHARE_STRICT: '1' })
    await failing('placeholder favicon', { SHARE_STRICT: '1' })
  })

  it('recognises the Latvian and Russian instructions too', async () => {
    edit('lv/index.html', (html) => html.replace(/(name="description" content=")[^"]*/, '$1Aizstājiet šo ar vienu teikumu par to, ko uzņēmums dara un kam tas ir domāts.'))
    edit('index.html', (html) => html.replace(/(name="description" content=")[^"]*/, '$1Замените этот текст одним предложением о том, чем занимается компания и для кого.'))
    const { warnings } = await run()
    const line = warnings.find((w) => w.includes('placeholder copy')) ?? ''
    expect(line).toContain('2 pages')
    expect(line).toContain('lv/index.html')
    expect(line).toContain('index.html')
  })
})
