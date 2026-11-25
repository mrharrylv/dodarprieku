/// <reference types="vitest/config" />
import { defaultServerConditions, defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import { edgeAnswer, type ViewerRequestHandler } from './src/lib/edge-preview.ts'
import { resolveActiveStyle, transformIndexCss } from './src/styles/build.ts'

const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url))

const STYLES_DIR = here('./src/styles')

/** Every folder under src/styles/ that has a style.ts. Sorted for stable messages. */
const availableStyles = (): readonly string[] =>
  readdirSync(STYLES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(STYLES_DIR, entry.name, 'style.ts')))
    .map((entry) => entry.name)
    .sort()

/** The committed choice, overridable by VITE_SITE_STYLE for a CI preview. */
const activeStyleId = (mode: string): string => {
  const config = JSON.parse(readFileSync(here('./site.config.json'), 'utf8')) as { style?: unknown }

  return resolveActiveStyle({
    fromEnv: loadEnv(mode, here('.'), 'VITE_').VITE_SITE_STYLE ?? '',
    fromFile: typeof config.style === 'string' ? config.style : '',
    available: availableStyles(),
  })
}

/**
 * Canonical origin for absolute URLs in index.html, or empty when
 * VITE_SITE_URL is unset or is not a URL. An empty origin still builds, with
 * relative URLs and no sitemap.xml or llms.txt: right for development and a
 * local check, and never deployed. The deploy refuses it twice: before the
 * build (.github/scripts/resolve-site-url.sh, the "Resolve site URL" step)
 * and before anything is uploaded (Phase 0, .github/actions/deploy-site/
 * preflight.sh).
 */
/**
 * Eight hex digits of public/og-image.png's content, or '' when it is missing.
 * Appended to the share card's URL (`shareImagePath` in src/lib/seo.ts), so a
 * redrawn card is a new URL and WhatsApp, iMessage and Telegram, which cache
 * a link's card for days by image URL, fetch it again.
 */
const shareImageVersion = (): string => {
  const file = here('./public/og-image.png')
  return existsSync(file) ? createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 8) : ''
}

const resolveSiteUrl = (mode: string): string => {
  const raw = loadEnv(mode, here('.'), 'VITE_').VITE_SITE_URL?.trim() ?? ''
  if (raw === '') return ''
  try {
    return new URL(raw).origin
  } catch {
    console.error(`[config] VITE_SITE_URL is not a valid URL: "${raw}". Ignoring.`)
    return ''
  }
}

/**
 * Wires the active style into the two files that cannot use a JS alias.
 *
 * `index.css` gets the style's token overrides `@import`ed into the
 * `components` layer, so they beat the base semantic tokens, and a `@source`
 * for the style's folder, so Tailwind generates its utilities. Together with
 * `@source not "./styles/**"` in index.css, that keeps every inactive style's
 * classes out of the CSS.
 *
 * `index.html` gets `__SITE_URL__` replaced: social crawlers need an absolute
 * `og:image`, and they read the static HTML, never the runtime `<Seo>`.
 *
 * `enforce: 'pre'` and first in the plugin list, so Tailwind sees the
 * substituted CSS.
 */
const activeStyle = (id: string, siteUrl: string, shareVersion: string): Plugin => ({
  name: 'active-style',
  enforce: 'pre',
  transform(code, file) {
    if (!file.endsWith('/src/index.css')) return null
    return { code: transformIndexCss(code, { id, available: availableStyles() }), map: null }
  },
  transformIndexHtml(html) {
    return html
      .replaceAll('?v=__SHARE_VERSION__', shareVersion === '' ? '' : `?v=${shareVersion}`)
      .replaceAll('__SITE_URL__', siteUrl)
  },
})

/**
 * `vite preview` answering the way CloudFront does, so a local check of the
 * build sees what production serves. Every request goes through the SAME
 * function the edge runs (infrastructure/terraform/functions/viewer-request.js):
 * its 301s are sent as they are, each page's URL is mapped to its prerendered
 * file, and a missing file (or an address no file could have, such as a
 * malformed percent-escape) is answered with 404.html and a 404 status, rather
 * than preview's own fallback of index.html with a 200. The decisions are
 * `edgeAnswer` (src/lib/edge-preview.ts), where they are tested.
 */
const EDGE_FUNCTION = here('../../../infrastructure/terraform/functions/viewer-request.js')

const edgePreview = (): Plugin => ({
  name: 'edge-preview',
  configurePreviewServer(server) {
    const handler = new Function(`${readFileSync(EDGE_FUNCTION, 'utf8')}\nreturn handler`)() as ViewerRequestHandler
    const dist = resolve(server.config.root, server.config.build.outDir)
    const hasFile = (path: string): boolean => {
      const file = resolve(dist, `.${path}`)
      return file.startsWith(`${dist}${sep}`) && existsSync(file) && statSync(file).isFile()
    }

    server.middlewares.use((req, res, next) => {
      const answer = edgeAnswer(handler, req.url ?? '/', hasFile)
      if (answer.kind === 'file') {
        req.url = answer.url
        next()
        return
      }
      if (answer.kind === 'response') {
        res.statusCode = answer.status
        for (const [name, value] of Object.entries(answer.headers)) res.setHeader(name, value)
        res.end()
        return
      }
      res.statusCode = 404
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end(readFileSync(join(dist, '404.html')))
    })
  },
})

/**
 * Chunking for the browser bundle.
 *
 * Keep the framework in its own long-lived chunk: it changes far less often
 * than the site's own copy, so editing a headline does not force every
 * returning visitor to re-download React.
 *
 * Matched on the resolved path rather than by package name. A name list
 * silently misses deep entry points: `react-dom/client` is not the same module
 * id as `react-dom`, so it would land in the app chunk and 130 KB of framework
 * would be re-downloaded on every content change.
 *
 * Rolldown groups (Vite 8), with priorities, rather than the old Rollup
 * `manualChunks` function: under Rolldown that function is a compatibility
 * shim that let React itself slide into the i18n chunk, because
 * react-i18next was the first module to import it. Higher priority wins.
 */
const CHUNK_GROUPS = [
  { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/, priority: 30 },
  { name: 'i18n', test: /node_modules[\\/](i18next|react-i18next|i18next-[\w-]+|html-parse-stringify|void-elements)[\\/]/, priority: 20 },
  { name: 'vendor', test: /node_modules[\\/]/, priority: 10 },
]

/**
 * Two builds share this config. `vite build` is the browser bundle in `dist/`.
 * `vite build --ssr src/entry-server.tsx` (see `npm run build`) is the same
 * app compiled for Node, which `scripts/prerender.mjs` runs to write every
 * page's HTML into `dist/`, and, when `VITE_SITE_URL` is set, robots.txt,
 * sitemap.xml and llms.txt from those pages' heads. Same aliases, same active
 * style, same `VITE_*` values, so the prerendered markup is exactly what the
 * browser hydrates.
 */
export default defineConfig(({ mode, isSsrBuild }) => {
  const style = activeStyleId(mode)
  const siteUrl = resolveSiteUrl(mode)
  const shareVersion = shareImageVersion()

  return {
    plugins: [activeStyle(style, siteUrl, shareVersion), react(), tailwindcss(), edgePreview()],

    define: {
      // The footer's copyright year while hydrating: see CopyrightYear.tsx.
      __BUILD_YEAR__: JSON.stringify(new Date().getFullYear()),
      // The share card's content hash: see shareImagePath in src/lib/seo.ts.
      __SHARE_IMAGE_VERSION__: JSON.stringify(shareVersion),
    },

    ssr: {
      // Compiled into the server bundle rather than imported from node_modules
      // at run time. The package's CommonJS entry hides its named exports from
      // Node's ESM loader, and which entry Node picks depends on its version;
      // bundling resolves the ESM build once, at build time. React itself stays
      // external, so there is exactly one copy of it.
      noExternal: ['react-router', 'react-router-dom'],
      // ...and the ESM build is what `module-sync` names under the package's
      // `node` export, which Vite's default server conditions do not include.
      resolve: { conditions: [...defaultServerConditions, 'module-sync'] },
    },

    resolve: {
      alias: {
        '@active-style': join(STYLES_DIR, style),
        '@': here('./src'),
      },
    },

    build: {
      // A marketing site is judged on first paint. Warn early rather than
      // discovering a 900 KB entry chunk in production.
      chunkSizeWarningLimit: 400,
      // public/ belongs in the site, not in the prerender's throwaway build.
      copyPublicDir: isSsrBuild !== true,
      rolldownOptions: isSsrBuild === true ? {} : { output: { codeSplitting: { groups: CHUNK_GROUPS } } },
    },

    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.test.{ts,tsx}',
          'src/test/**',
          'src/main.tsx',
          'src/vite-env.d.ts',
          'src/styles/active.d.ts',
          // Locale JSON and the barrel that imports it hold no logic; the parity
          // test covers what matters about them.
          'src/i18n/locales/**',
        ],
        // Enforced, not advisory: a change that drops below these fails the
        // build. Raise them as coverage improves; never lower them to go green.
        thresholds: {
          statements: 80,
          lines: 80,
          functions: 80,
          branches: 75,
        },
      },
    },
  }
})
