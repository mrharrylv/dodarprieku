/**
 * The share guard: fails the build when a page would not make a good link
 * preview or a good browser tab.
 *
 *   node scripts/verify-share.mjs [distDir]      the last step of `npm run build`
 *
 * It reads the FINISHED dist/ (what a crawler reads), not the source, so it
 * catches a template edit, a regenerated image or a missing file alike:
 *
 *   every page   title (60 chars at most), description (50 to 160), og:title,
 *                og:description, og:type, og:url, og:site_name, og:locale and
 *                an og:locale:alternate for every other language, og:image
 *                (absolute https) with width, height, alt and type,
 *                twitter:card summary_large_image with title, description
 *                and image, a canonical equal to og:url, application-name,
 *                apple-mobile-web-app-title, theme-color, the icon links
 *   the card     exists in dist, exactly 1200x630, PNG or JPEG, opaque, at
 *                most 300 KB (WhatsApp drops larger previews), and the
 *                declared width, height and type are the file's own
 *   the icons    apple-touch-icon 180x180 and opaque, favicon.ico holding
 *                16, 32 and 48, favicon.svg, favicon-96x96.png, every
 *                manifest icon at its declared size, manifest name and
 *                short_name equal to the site's
 *
 * PLACEHOLDERS (the template's "Replace this..." copy, the placeholder
 * favicon) are a WARNING locally and a FAILURE under SHARE_STRICT=1. A
 * relative og:image, which is what a build without VITE_SITE_URL writes, is a
 * warning locally too, and a failure when VITE_SITE_URL is set or under
 * SHARE_STRICT=1. Templates deploy their placeholders for review, so
 * deploy.yaml leaves SHARE_STRICT unset; a real site sets it (doc/deployment.md).
 *
 * Needs `sharp` (a devDependency).
 */
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import sharp from 'sharp'

import { readIcoDirectory } from './lib/ico.mjs'

/** WhatsApp drops a preview image over about 300 KB. Mirrors SHARE_IMAGE.maxBytes in src/config/constants.ts. */
export const MAX_IMAGE_BYTES = 300 * 1024
/** Aim below this: a slow connection may time the fetch out well before 300 KB. */
export const TARGET_IMAGE_BYTES = 200 * 1024
export const MAX_TITLE = 60
export const DESCRIPTION_RANGE = Object.freeze({ min: 50, max: 160 })
const CARD = Object.freeze({ width: 1200, height: 630 })
const TOUCH_ICON = 180
const ICO_SIZES = Object.freeze([16, 32, 48])
const MIME = Object.freeze({ png: 'image/png', jpeg: 'image/jpeg' })

/** The opening words of the template's instructions in en, lv and ru (src/lib/placeholder.ts). */
const PLACEHOLDER_COPY = /Replace this with|Replace with a sentence|Aizstājiet šo ar|Aizstājiet ar teikumu|Замените этот текст|Замените одним предложением/i

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'" }
const decode = (text) => text.replace(/&(?:amp|lt|gt|quot|apos|#39);/g, (entity) => ENTITIES[entity])
const length = (text) => Array.from(text).length

const attributesOf = (tag) =>
  Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, name, value]) => [name, decode(value)]))

const tagsOf = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map(([tag]) => attributesOf(tag))

/** One page's head, as data. */
const readHead = (html) => {
  const head = html.split('</head>')[0] ?? html
  const metas = tagsOf(head, 'meta')
  const valuesOf = (key) =>
    metas.filter((meta) => meta.name === key || meta.property === key).map((meta) => meta.content ?? '')
  return {
    lang: html.match(/<html[^>]*\blang="([^"]*)"/)?.[1] ?? '',
    title: head.match(/<title>([^<]*)<\/title>/)?.[1],
    metas,
    one: (key) => valuesOf(key)[0],
    all: valuesOf,
    links: tagsOf(head, 'link'),
  }
}

const walkPages = async (dir, base = dir) => {
  const entries = await readdir(dir, { withFileTypes: true })
  const found = await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) return entry.name === 'assets' ? [] : walkPages(path, base)
      return entry.name.endsWith('.html') ? [path.slice(base.length + 1)] : []
    }),
  )
  return found.flat().sort()
}

const readBuffer = (distDir, file) => readFile(join(distDir, file)).catch(() => null)

/** The file in dist that a URL or path names: origin, query and hash dropped. */
const fileOf = (reference) => {
  const path = /^https?:\/\//.test(reference) ? new URL(reference).pathname : reference.split(/[?#]/)[0]
  return path.replace(/^\/+/, '')
}

const REQUIRED = [
  'og:title',
  'og:description',
  'og:type',
  'og:site_name',
  'og:locale',
  'og:image',
  'og:image:width',
  'og:image:height',
  'og:image:alt',
  'og:image:type',
  'twitter:title',
  'twitter:description',
  'twitter:image',
  'application-name',
  'apple-mobile-web-app-title',
]

/** How a finding is reported: a failure, or only a warning where it is merely a placeholder. */
const reporter = (strict) => {
  const failures = []
  const warnings = []
  return {
    failures,
    warnings,
    fail: (page, text) => failures.push(`${page}: ${text}`),
    placeholder: (page, text) =>
      strict ? failures.push(`${page}: ${text} (SHARE_STRICT=1)`) : warnings.push({ page, text }),
    warn: (page, text) => warnings.push({ page, text }),
  }
}

/** One line per distinct warning: the same text on 26 pages is one warning naming 26 pages. */
const grouped = (entries) => {
  const byText = entries.reduce(
    (groups, { page, text }) => groups.set(text, [...(groups.get(text) ?? []), page]),
    new Map(),
  )
  return [...byText].map(([text, pages]) =>
    pages.length === 1 ? `${pages[0]}: ${text}` : `${text} [${pages.length} pages: ${pages.slice(0, 3).join(', ')}, ...]`,
  )
}

const checkPage = ({ page, head, languages, report, originRequired }) => {
  const noIndex = (head.one('robots') ?? '').includes('noindex')

  if (head.title === undefined || decode(head.title).trim() === '') report.fail(page, 'title is missing')
  else if (length(decode(head.title)) > MAX_TITLE) {
    report.fail(page, `title is ${length(decode(head.title))} characters; keep it to ${MAX_TITLE} or search results cut it`)
  }
  if (head.title !== undefined && PLACEHOLDER_COPY.test(head.title)) report.placeholder(page, 'title is placeholder copy')

  const description = head.one('description')
  if (description === undefined) report.fail(page, 'meta description is missing')
  else {
    const size = length(description)
    if (size < DESCRIPTION_RANGE.min || size > DESCRIPTION_RANGE.max) {
      report.fail(page, `description is ${size} characters; it should be ${DESCRIPTION_RANGE.min} to ${DESCRIPTION_RANGE.max}`)
    }
    if (PLACEHOLDER_COPY.test(description)) report.placeholder(page, 'description is placeholder copy')
  }

  for (const key of REQUIRED) if (head.one(key) === undefined) report.fail(page, `${key} is missing`)
  if (!noIndex && head.one('og:url') === undefined) report.fail(page, 'og:url is missing')
  if (head.one('twitter:card') !== 'summary_large_image') report.fail(page, 'twitter:card must be summary_large_image')
  if (head.one('twitter:image') !== head.one('og:image')) report.fail(page, 'twitter:image must equal og:image')

  const canonical = head.links.find((link) => link.rel === 'canonical')?.href
  if (!noIndex && canonical !== head.one('og:url')) {
    report.fail(page, `canonical (${canonical ?? 'none'}) must equal og:url (${head.one('og:url') ?? 'none'})`)
  }

  const locale = head.one('og:locale')
  if (locale !== undefined) {
    if (!/^[a-z]{2,3}_[A-Z]{2}$/.test(locale)) report.fail(page, `og:locale "${locale}" must be language_TERRITORY, such as lv_LV`)
    else if (head.lang !== '' && locale.split('_')[0] !== head.lang.split('-')[0]) {
      report.fail(page, `og:locale "${locale}" does not match <html lang="${head.lang}">`)
    }
  }
  const wanted = languages.filter((code) => code !== head.lang.split('-')[0]).sort()
  const got = head.all('og:locale:alternate').map((value) => value.split('_')[0]).sort()
  if (wanted.join() !== got.join()) {
    report.fail(page, `og:locale:alternate lists [${got.join(', ')}]; the other languages are [${wanted.join(', ')}]`)
  }

  const image = head.one('og:image')
  if (image !== undefined && !/^https:\/\//.test(image)) {
    const text = /^http:\/\//.test(image)
      ? `og:image "${image}" must be https`
      : `og:image "${image}" is not absolute: WhatsApp and Facebook ignore a relative one. Build with VITE_SITE_URL set`
    if (/^http:\/\//.test(image) || originRequired) report.fail(page, text)
    else report.warn(page, `${text} (a local build has no origin; the deploy always sets VITE_SITE_URL)`)
  }

  if (head.all('theme-color').length === 0) report.fail(page, 'theme-color meta is missing')
  for (const rel of ['icon', 'apple-touch-icon', 'manifest']) {
    if (!head.links.some((link) => link.rel === rel)) report.fail(page, `link rel="${rel}" is missing`)
  }
}

/** Reads the card once: its real type, size and weight, and every way it breaks the rules. */
const inspectCard = async (distDir, file) => {
  const buffer = await readBuffer(distDir, file)
  if (buffer === null) return { problems: [`og:image file ${file} is not in dist`], warnings: [] }

  const meta = await sharp(buffer).metadata().catch(() => ({}))
  const type = MIME[meta.format]
  if (type === undefined) return { problems: [`og:image ${file} is ${meta.format ?? 'not an image'}; it must be PNG or JPEG`], warnings: [] }

  const problems = []
  const warnings = []
  if (meta.width !== CARD.width || meta.height !== CARD.height) {
    problems.push(`og:image ${file} is ${meta.width}x${meta.height}; it must be exactly ${CARD.width}x${CARD.height}`)
  }
  if (!(await sharp(buffer).stats()).isOpaque) problems.push(`og:image ${file} must be opaque (no alpha channel)`)
  const kb = (buffer.length / 1024).toFixed(0)
  if (buffer.length > MAX_IMAGE_BYTES) {
    problems.push(`og:image ${file} is ${kb} KB; WhatsApp drops previews over ${MAX_IMAGE_BYTES / 1024} KB`)
  } else if (buffer.length > TARGET_IMAGE_BYTES) {
    warnings.push(`og:image ${file} is ${kb} KB; aim below ${TARGET_IMAGE_BYTES / 1024} KB`)
  }
  return { problems, warnings, type, width: meta.width, height: meta.height }
}

const checkRaster = async ({ distDir, file, size, report, page, label, opaque = true }) => {
  const buffer = await readBuffer(distDir, file)
  if (buffer === null) return report.fail(page, `${label} ${file} is not in dist`)
  if (file.endsWith('.svg')) return
  const meta = await sharp(buffer).metadata().catch(() => null)
  if (meta === null) return report.fail(page, `${label} ${file} is not an image`)
  if (size !== undefined && (meta.width !== size || meta.height !== size)) {
    report.fail(page, `${label} ${file} is ${meta.width}x${meta.height}; it must be ${size}x${size}`)
  }
  if (opaque && !(await sharp(buffer).stats()).isOpaque) report.fail(page, `${label} ${file} must be opaque`)
}

const checkIcons = async ({ distDir, heads, report }) => {
  const hrefs = (rel) => [...new Set(heads.flatMap(({ head }) => head.links.filter((l) => l.rel === rel).map((l) => l.href)))]

  for (const href of hrefs('apple-touch-icon')) {
    await checkRaster({ distDir, file: fileOf(href), size: TOUCH_ICON, report, page: 'icons', label: 'apple-touch-icon' })
  }
  for (const href of hrefs('icon')) {
    const file = fileOf(href)
    if (file.endsWith('.ico')) {
      const ico = await readBuffer(distDir, file)
      if (ico === null) report.fail('icons', `${file} is not in dist`)
      else {
        const sizes = readIcoDirectory(ico).map((entry) => entry.width)
        if (ICO_SIZES.some((size) => !sizes.includes(size))) {
          report.fail('icons', `${file} holds ${sizes.join('/')}; it must hold ${ICO_SIZES.join('/')}`)
        }
      }
    } else if (file.endsWith('.svg')) {
      if ((await readBuffer(distDir, file)) === null) report.fail('icons', `${file} is not in dist`)
    } else {
      const size = Number(file.match(/(\d+)x\1/)?.[1])
      await checkRaster({ distDir, file, size: Number.isFinite(size) ? size : undefined, report, page: 'icons', label: 'icon' })
    }
  }
  for (const required of ['favicon.svg', 'favicon-96x96.png', 'favicon.ico']) {
    if (!hrefs('icon').some((href) => fileOf(href) === required)) report.fail('icons', `no page links ${required}`)
    if ((await readBuffer(distDir, required)) === null) report.fail('icons', `${required} is not in dist`)
  }
}

const checkManifest = async ({ distDir, heads, report }) => {
  const href = heads.map(({ head }) => head.links.find((l) => l.rel === 'manifest')?.href).find((h) => h !== undefined)
  if (href === undefined) return
  const raw = await readBuffer(distDir, fileOf(href))
  if (raw === null) return report.fail('manifest', `${href} is not in dist`)
  let manifest
  try {
    manifest = JSON.parse(raw.toString('utf8'))
  } catch {
    return report.fail('manifest', `${href} is not valid JSON`)
  }

  const home = heads[0].head
  if (manifest.name !== home.one('og:site_name')) {
    report.fail('manifest', `manifest name "${manifest.name}" is not the site's, "${home.one('og:site_name')}"`)
  }
  if (manifest.short_name !== home.one('application-name')) {
    report.fail('manifest', `manifest short_name "${manifest.short_name}" is not the site's, "${home.one('application-name')}"`)
  }
  if (typeof manifest.description === 'string' && PLACEHOLDER_COPY.test(manifest.description)) {
    report.placeholder('manifest', 'manifest description is placeholder copy')
  }
  for (const icon of manifest.icons ?? []) {
    const size = /^(\d+)x\1$/.test(icon.sizes ?? '') ? Number(icon.sizes.split('x')[0]) : undefined
    await checkRaster({
      distDir,
      file: fileOf(icon.src),
      size,
      report,
      page: 'manifest',
      label: 'manifest icon',
      opaque: icon.type !== 'image/svg+xml',
    })
  }
}

/**
 * Reads every page and the icons in `distDir`.
 * @returns {Promise<{ failures: string[], warnings: string[], pages: number }>}
 */
export const verifyShare = async ({ distDir, env = process.env }) => {
  const strict = env.SHARE_STRICT === '1'
  const originRequired = strict || (env.VITE_SITE_URL ?? '').trim() !== ''
  const report = reporter(strict)

  const files = await walkPages(distDir)
  if (files.length === 0) {
    report.fail('dist', `no pages found in ${distDir}`)
    return { failures: report.failures, warnings: [], pages: 0 }
  }

  const heads = await Promise.all(
    files.map(async (page) => ({ page, head: readHead(await readFile(join(distDir, page), 'utf8')) })),
  )
  const languages = [...new Set(heads.map(({ head }) => head.lang.split('-')[0]).filter((code) => code !== ''))]

  for (const { page, head } of heads) checkPage({ page, head, languages, report, originRequired })

  const cards = new Map()
  for (const { page, head } of heads) {
    const reference = head.one('og:image')
    if (reference === undefined) continue
    const file = fileOf(reference)
    if (!cards.has(file)) {
      const card = await inspectCard(distDir, file)
      cards.set(file, card)
      for (const problem of card.problems) report.fail(page, problem)
      for (const warning of card.warnings) report.warn(page, warning)
    }
    const card = cards.get(file)
    if (card.type === undefined) continue
    const declared = { 'og:image:type': card.type, 'og:image:width': String(card.width), 'og:image:height': String(card.height) }
    for (const [key, actual] of Object.entries(declared)) {
      const said = head.one(key)
      if (said !== undefined && said !== actual) report.fail(page, `${key} says "${said}"; ${file} is "${actual}"`)
    }
  }

  await checkIcons({ distDir, heads, report })
  await checkManifest({ distDir, heads, report })

  const favicon = await readBuffer(distDir, 'favicon.svg')
  if (favicon?.toString('utf8').includes('data-placeholder="true"')) {
    report.placeholder('icons', 'placeholder favicon (favicon.svg still carries data-placeholder): replace it with the real logo, then run npm run images')
  }

  return { failures: report.failures, warnings: grouped(report.warnings), pages: files.length }
}

const main = async () => {
  const here = dirname(fileURLToPath(import.meta.url))
  const distDir = process.argv[2] ?? join(here, '..', 'dist')
  const { failures, warnings, pages } = await verifyShare({ distDir })

  for (const warning of warnings) console.warn(`[verify-share] warning: ${warning}`)
  if (failures.length > 0) {
    console.error(`\n[verify-share] ${failures.length} problem(s) in ${pages} page(s):\n`)
    for (const failure of failures) console.error(`  ${failure}`)
    process.exitCode = 1
    return
  }
  console.log(`[verify-share] ${pages} pages, card and icons ok${warnings.length > 0 ? `, ${warnings.length} warning(s)` : ''}`)
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
