/**
 * Writes every page of the site into dist/ as real HTML.
 *
 *   npm run build     # vite build, then vite build --ssr, then this
 *
 * `vite build` leaves one dist/index.html: an empty <div id="root"> that the
 * bundle fills in the browser. A crawler that runs no JavaScript (a social
 * card, Bing's first pass, the AI crawlers) reads that shell for every URL:
 * one title, one description, no canonical, no copy. So after it, the app is
 * compiled for Node (`vite build --ssr src/entry-server.tsx`) and this script
 * renders each route in each language into its own file, with its own head:
 *
 *   dist/<locale>/<route>/index.html   every page (dist/en/about/index.html)
 *   dist/index.html                    the default language's home page again
 *   dist/404.html                      the not-found page, served with a 404
 *   dist/robots.txt, sitemap.xml, llms.txt
 *                                      when VITE_SITE_URL is set, built from
 *                                      what those pages' heads declare
 *
 * Every page is rendered and checked before any file is written, and one bad
 * page fails the build (see validatePage in src/lib/prerender.ts): a page that
 * throws, renders an empty root, lacks exactly one <h1>, or declares the wrong
 * canonical does not ship. The crawler files come from the same heads (see
 * src/lib/crawler-files.ts), so the sitemap lists exactly the URLs the pages
 * call canonical; heads that cannot make one fail the build too. The
 * decisions all live in src/lib; this file only reads and writes.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const DIST_DIR = join(ROOT, 'dist')
export const SSR_DIR = join(ROOT, 'dist-ssr')

const message = (error) => (error instanceof Error ? (error.stack ?? error.message) : String(error))

/** Renders and checks one page. Returns its HTML and head, or why it cannot ship. */
const renderOne = async (ssr, template, page, siteUrl) => {
  try {
    const rendered = await ssr.renderPage(page)
    const problems = ssr.validatePage(page, rendered, siteUrl)
    return problems.length > 0
      ? { page, problems }
      : { page, problems: [], head: rendered.head, html: ssr.pageDocument(template, page, rendered) }
  } catch (error) {
    return { page, problems: [message(error)] }
  }
}

/**
 * robots.txt, sitemap.xml and llms.txt for the rendered pages, or why they
 * cannot be written. None without an origin: every URL in them must be
 * absolute, and public/robots.txt (no Sitemap line) stays as it was copied.
 */
const crawlerFilesOf = (ssr, results, siteUrl) => {
  if (siteUrl === '') return { files: [], problems: [] }
  try {
    return { files: ssr.crawlerFilesFor(siteUrl, results.map(({ page, head }) => ({ page, head }))), problems: [] }
  } catch (error) {
    return { files: [], problems: [`crawler files: ${message(error)}`] }
  }
}

const writeInto = async (distDir, file, text) => {
  const target = join(distDir, file)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, text, 'utf8')
}

/**
 * Renders every page `ssr` lists into `distDir`, using `distDir/index.html`
 * as the template, then the crawler files from their heads. `ssr` is the
 * compiled entry-server module.
 *
 * Returns `{ ok, failures, written, crawlerFiles, siteUrl }`: `written` the
 * page files, `crawlerFiles` the crawler files' names. Writes nothing unless
 * every page passed and the crawler files could be built, so a failed build
 * never leaves half a site behind.
 */
export const prerender = async ({ distDir, ssr }) => {
  const template = await readFile(join(distDir, 'index.html'), 'utf8')
  const siteUrl = ssr.siteOrigin()

  // One at a time: a render switches the app's one i18next instance to the
  // page's language, so two at once would render each other's words.
  const results = []
  for (const page of ssr.prerenderPages()) {
    results.push(await renderOne(ssr, template, page, siteUrl))
  }

  const pageFailures = results.flatMap(({ page, problems }) => problems.map((problem) => `${page.url}: ${problem}`))
  if (pageFailures.length > 0) return { ok: false, failures: pageFailures, written: [], crawlerFiles: [], siteUrl }

  const crawler = crawlerFilesOf(ssr, results, siteUrl)
  if (crawler.problems.length > 0) return { ok: false, failures: crawler.problems, written: [], crawlerFiles: [], siteUrl }

  const writes = results.flatMap(({ page, html }) => page.files.map((file) => ({ file, html })))
  for (const { file, html } of writes) await writeInto(distDir, file, html)
  for (const [file, text] of crawler.files) await writeInto(distDir, file, text)

  return {
    ok: true,
    failures: [],
    written: writes.map(({ file }) => file),
    crawlerFiles: crawler.files.map(([file]) => file),
    siteUrl,
  }
}

const main = async () => {
  try {
    const ssr = await import(/* @vite-ignore */ pathToFileURL(join(SSR_DIR, 'entry-server.js')).href)
    const result = await prerender({ distDir: DIST_DIR, ssr })

    if (!result.ok) {
      console.error(`\n[prerender] ${result.failures.length} problem(s); nothing was written:\n`)
      for (const failure of result.failures) console.error(`  ${failure}`)
      process.exitCode = 1
      return
    }

    console.log(`\n[prerender] ${result.written.length} pages written into dist/`)
    if (result.siteUrl === '') {
      console.warn(
        '[prerender] VITE_SITE_URL is not set: canonical, hreflang and og:url are relative. ' +
          'Fine for a local check; do not deploy this build.',
      )
      console.log(
        '[crawler-files] VITE_SITE_URL is not set: no sitemap.xml or llms.txt in this build, ' +
          'and robots.txt is the committed one without a Sitemap line.',
      )
    } else {
      console.log(`[crawler-files] ${result.crawlerFiles.join(', ')} for ${result.siteUrl}`)
    }
  } finally {
    // The Node build is scaffolding for this script, never part of the site.
    await rm(SSR_DIR, { recursive: true, force: true })
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
