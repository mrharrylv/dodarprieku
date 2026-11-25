// Renders christmas-poster.html to PNG (A3 at 2x, for screens and print
// shops that take images) and PDF (A3, vector text). Run from anywhere:
//   node doc/marketing/render-poster.mjs
// Needs Playwright's Chromium and the website's node_modules (fonts).
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
// Playwright is a dev dependency of the website package, not of the repo root.
const { chromium } = createRequire(join(here, '../../services/frontend/website/package.json'))('playwright')
const page = pathToFileURL(join(here, 'christmas-poster.html')).href

// Playwright's own Chromium when it is installed for this version, else the
// Mac's Google Chrome.
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }))
try {
  const tab = await browser.newPage({ viewport: { width: 1123, height: 1587 }, deviceScaleFactor: 2 })
  await tab.goto(page)
  await tab.evaluate(() => document.fonts.ready)
  await tab.screenshot({ path: join(here, 'christmas-poster.png') })
  await tab.pdf({ path: join(here, 'christmas-poster.pdf'), width: '297mm', height: '420mm', printBackground: true, pageRanges: '1' })
  console.log('wrote christmas-poster.png and christmas-poster.pdf')
} finally {
  await browser.close()
}
