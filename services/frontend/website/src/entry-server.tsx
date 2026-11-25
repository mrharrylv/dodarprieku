import { StrictMode } from 'react'
import { prerender } from 'react-dom/static'
import { StaticRouter } from 'react-router-dom'

import i18n, { resources } from '@/i18n'
import { App } from '@/App'
import { HeadCollectorContext } from '@/components/seo/head-collector'
import { originUrl } from '@/config/env'
import * as site from '@/config/site'
import { ThemeProvider } from '@/context/ThemeProvider'
import { crawlerFiles, type NamespaceReader } from '@/lib/crawler-files'
import type { PageHead } from '@/lib/head'
import { declaredPages, type PrerenderPage, type RenderedPage } from '@/lib/prerender'

/**
 * The app, compiled for Node, for the build's prerender.
 *
 * `npm run build` compiles this with `vite build --ssr` and
 * `scripts/prerender.mjs` calls it once per page. It is never in the browser
 * bundle. Everything that decides something (which pages, where they go, what
 * makes one fit to ship) is in `lib/prerender.ts` and re-exported here, so the
 * Node script is only file handling.
 *
 * The tree must be `main.tsx`'s, provider for provider, with the router
 * swapped for a static one: hydration reuses this markup only if the browser
 * renders the same elements in the same order. `entry-server.test.tsx` renders
 * here and hydrates in jsdom to prove that it does.
 */

export { pageDocument, prerenderPages, validatePage } from '@/lib/prerender'

/** The origin the head's absolute URLs use: `VITE_SITE_URL`, or empty without one. */
export const siteOrigin = (): string => originUrl()

/** One namespace of one locale, from the same bundled strings the pages render. */
const readBundled: NamespaceReader = (locale, namespace) =>
  (resources as Readonly<Record<string, Readonly<Record<string, unknown>>>>)[locale]?.[namespace]

/**
 * robots.txt, sitemap.xml and llms.txt for the pages just rendered, as
 * `[fileName, source]` pairs, built from what each page's head declares (see
 * `lib/crawler-files.ts`). Throws when the heads cannot make a sitemap: no
 * absolute origin, or a canonical no page claims.
 */
export const crawlerFilesFor = (
  siteUrl: string,
  rendered: ReadonlyArray<{ readonly page: PrerenderPage; readonly head: PageHead | null }>,
): ReadonlyArray<readonly [fileName: string, source: string]> =>
  crawlerFiles({ siteUrl, site, read: readBundled, pages: declaredPages(rendered, siteUrl) })

/**
 * Renders one page to HTML, waiting for every lazy chunk and Suspense boundary
 * to resolve (that is what `prerender` does, unlike `renderToString`), and
 * returns it with the head its `<Seo>` computed.
 *
 * Throws if anything in the tree threw. A build that shipped the fallback of a
 * failed boundary would ship a blank page to every crawler.
 */
export const renderPage = async (page: PrerenderPage): Promise<RenderedPage> => {
  await i18n.changeLanguage(page.locale)

  let head: PageHead | null = null
  const collect = (computed: PageHead) => {
    head = computed
  }
  const failures: string[] = []

  const { prelude } = await prerender(
    <StrictMode>
      <HeadCollectorContext.Provider value={collect}>
        <ThemeProvider>
          <StaticRouter location={page.url}>
            <App />
          </StaticRouter>
        </ThemeProvider>
      </HeadCollectorContext.Provider>
    </StrictMode>,
    {
      // Never outline a Suspense boundary. React moves a boundary bigger than
      // this (12.8 KB by default: every legal page) out of place into a hidden
      // <div> and puts it back with an INLINE script. Production's CSP blocks
      // that script, and a crawler that runs none sees the blank fallback.
      progressiveChunkSize: Number.POSITIVE_INFINITY,
      onError: (error) => {
        failures.push(error instanceof Error ? (error.stack ?? error.message) : String(error))
      },
    },
  )

  // Response decodes the whole stream as UTF-8 at once, so a Latvian or
  // Russian character split across two chunks is not mangled.
  const body = await new Response(prelude).text()

  if (failures.length > 0) {
    throw new Error(`${page.url} threw while rendering:\n${failures.join('\n')}`)
  }
  return { body, head }
}
