/**
 * The accessibility audit: every prerendered page of the last build, in a real
 * browser, checked by axe-core against WCAG 2.2 AA plus axe's best practices.
 *
 *   npm run build && npm run a11y          (or: make a11y)
 *   A11Y_PAGES=/lv npm run a11y            only pages whose path starts /lv
 *
 * Each page is loaded four times: light and dark theme, a 390px phone and a
 * 1280px desktop, because a contrast or overflow bug usually lives in only one
 * of them. On top of axe it fails a page that
 *
 *   - has an <img> with no alt attribute at all (alt="" is a decision, and
 *     fine for a decorative image; a missing alt is an oversight), or
 *   - scrolls sideways (CLAUDE.md: no horizontal scrolling, ever).
 *
 * Motion is reduced for the run. The entrance animations fade text in from
 * opacity 0, and axe measuring a heading mid-fade reports contrast that no
 * visitor ever sees.
 *
 * It serves dist/ through `vite preview`, which answers the way CloudFront
 * does (vite.config.ts, edgePreview), so the 404 page and the redirects are
 * the real ones. Needs a Chromium for Playwright, installed once with
 * `npx playwright install chromium`; PLAYWRIGHT_CHROMIUM_PATH points it at
 * another one. Not part of `make verify`: it needs a browser, which CI's
 * verify job does not install.
 */
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import AxeBuilder from '@axe-core/playwright'
import { chromium } from 'playwright'
import { preview } from 'vite'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']
const VIEWS = [
  { scheme: 'light', width: 390 },
  { scheme: 'light', width: 1280 },
  { scheme: 'dark', width: 390 },
  { scheme: 'dark', width: 1280 },
]

/** Every page's URL path, from the index.html files the prerender wrote. */
export const pagePaths = (dist) => {
  const found = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) {
        if (name !== 'assets') walk(path)
      } else if (name === 'index.html') {
        found.push(`/${relative(dist, dir).split(sep).join('/')}`.replace(/\/$/, '') || '/')
      }
    }
  }
  walk(dist)
  return found.sort()
}

/**
 * What paints the very top row of the window, at the centre, before any
 * scroll: the tag of the first element under that point with a visible
 * background. `BODY` or `HTML` means a strip of bare page background shows
 * above the header (Harry, 2026-11-06: a 1px white line at the top in the
 * light theme, a dark one in the dark theme, when a hero slid under a header
 * one pixel taller than the hero's negative margin). Runs in the page.
 */
export const topPaint = () => {
  const painted = (element) => {
    const style = window.getComputedStyle(element)
    if (element.tagName === 'IMG' || element.tagName === 'VIDEO') return true
    if (style.backgroundImage !== 'none') return true
    // Any colour syntax (rgb, oklab, color-mix results); only a zero alpha
    // counts as unpainted.
    const colour = style.backgroundColor.replace(/\s+/g, '')
    return !(colour === 'transparent' || /,0\)$/.test(colour) || /\/0\)$/.test(colour))
  }
  const stack = document.elementsFromPoint(window.innerWidth / 2, 0)
  const first = stack.find(painted)
  return first === undefined ? 'HTML' : first.tagName
}

const main = async () => {
  const ROOT = fileURLToPath(new URL('..', import.meta.url))
  const DIST = join(ROOT, 'dist')

  if (!existsSync(join(DIST, 'index.html'))) {
    console.error('[a11y] dist/ has no build. Run `npm run build` first.')
    process.exit(1)
  }

  const prefix = process.env.A11Y_PAGES ?? ''
  const pages = pagePaths(DIST).filter((path) => path.startsWith(prefix))
  if (pages.length === 0) {
    console.error(`[a11y] no page path starts with "${prefix}".`)
    process.exit(1)
  }

  const server = await preview({ root: ROOT, preview: { port: 0, open: false }, logLevel: 'warn' })
  const origin = server.resolvedUrls?.local[0]?.replace(/\/$/, '')
  if (origin === undefined) {
    console.error('[a11y] vite preview did not report a local URL.')
    process.exit(1)
  }

  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH
  let browser
  try {
    browser = await chromium.launch(executablePath ? { executablePath } : {})
  } catch (error) {
    console.error(`[a11y] could not start Chromium: ${error.message.split('\n')[0]}`)
    console.error('[a11y] install it once with `npx playwright install chromium`.')
    await server.close()
    process.exit(1)
  }

  const problems = []
  try {
    for (const { scheme, width } of VIEWS) {
      const context = await browser.newContext({
        colorScheme: scheme,
        reducedMotion: 'reduce',
        viewport: { width, height: 900 },
      })
      const page = await context.newPage()
      for (const path of pages) {
        const where = `${path} (${scheme}, ${width}px)`
        await page.goto(`${origin}${path}`, { waitUntil: 'networkidle' })

        const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze()
        for (const violation of violations) {
          problems.push(`${where}: ${violation.id}, ${violation.help} [${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}]`)
        }

        const noAlt = await page.$$eval('img:not([alt])', (images) => images.map((image) => image.currentSrc || image.src))
        for (const src of noAlt) problems.push(`${where}: <img> without alt: ${src}`)

        const sideways = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
        if (sideways) problems.push(`${where}: the page scrolls sideways`)

        const top = await page.evaluate(topPaint)
        if (top === 'BODY' || top === 'HTML') {
          problems.push(`${where}: a strip of page background shows above the header`)
        }
      }
      await context.close()
    }
  } finally {
    await browser.close()
    await server.close()
  }

  const checked = `${pages.length} pages x ${VIEWS.length} views`
  if (problems.length > 0) {
    for (const problem of problems) console.error(`[a11y] ${problem}`)
    console.error(`[a11y] ${checked}: ${problems.length} problem(s)`)
    process.exit(1)
  }
  console.log(`[a11y] ${checked}: no problems`)
}

if (import.meta.url.startsWith('file:') && process.argv[1] === fileURLToPath(import.meta.url)) await main()
