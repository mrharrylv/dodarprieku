import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

import type { RenderedPage } from '@/lib/prerender'

/**
 * Prerenders pages in a separate Node process, the way the build does.
 *
 * A hydration test cannot render the server markup in its own process:
 * React's server renderer leaves context values behind for the next renderer
 * in the same JavaScript realm (it assumes it is alone, as it is in the
 * build), and the browser renderer then reads them and fails in ways no real
 * page ever would. So the markup comes from a child process that loads
 * `entry-server.tsx` through Vite, with no DOM, exactly as the build's
 * prerender sees the app. It inherits the environment, so `VITE_SITE_STYLE`
 * picks the same style as the test.
 */
const ROOT = join(__dirname, '..', '..')

const CHILD = `
import { createServer } from 'vite'
const server = await createServer({
  root: process.cwd(),
  logLevel: 'error',
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, ws: false },
  // The browser's dependency pre-bundling has nothing to do with a server
  // render, and a scan still running when the server closes prints an error.
  optimizeDeps: { noDiscovery: true, include: [] },
})
try {
  const ssr = await server.ssrLoadModule('/src/entry-server.tsx')
  const keys = JSON.parse(process.env.PRERENDER_KEYS ?? '[]')
  const pages = ssr.prerenderPages().filter((page) => keys.includes(page.key))
  const out = {}
  for (const page of pages) out[page.key] = await ssr.renderPage(page)
  process.stdout.write(JSON.stringify(out))
} finally {
  await server.close()
}
`

export const prerenderInChild = (keys: readonly string[]): Readonly<Record<string, RenderedPage>> => {
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', CHILD], {
    cwd: ROOT,
    env: { ...process.env, PRERENDER_KEYS: JSON.stringify(keys) },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
  return JSON.parse(output) as Record<string, RenderedPage>
}
