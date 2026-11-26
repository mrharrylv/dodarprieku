/**
 * Local dev server: `npm run dev` -> http://localhost:8787
 *
 *   /api/*               the real handlers, in-memory data
 *   /data/charities.json the snapshot the API keeps writing
 *   /media/*             uploaded and seeded images
 *
 * Emails are printed to the terminal so their links can be opened.
 */
import { randomUUID } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { createApp } from '../app'
import { parseCookies } from '../http/cookies'
import { stripApiPrefix } from '../http/event'
import type { ApiRequest } from '../http/types'
import type { Email } from '../mail/types'
import { loadImportedFile } from './imported-file'
import { createLocalDeps } from './local'
import { DEFAULT_DEMO_FRACTION, DEFAULT_DEMO_SEED } from '../domain/demo-needs'
import { DEV_ADMIN_EMAIL, DEV_CHARITY_EMAIL, DEV_PASSWORD, seedDev } from './seed'

const PORT = Number(process.env.PORT ?? 8787)
const MAX_BODY = 4 * 1024 * 1024

const out = (line: string): void => {
  process.stdout.write(`${line}\n`)
}

const printEmail = (e: Email): void => {
  out(`\n--- email to ${e.to} ---\nSubject: ${e.subject}\n\n${e.text}--- end ---\n`)
}

const deps = createLocalDeps(process.env, printEmail)
const app = createApp(deps)

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > MAX_BODY) {
        reject(new Error('body too large'))
        req.destroy()
      } else chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })

const headersOf = (req: IncomingMessage): Record<string, string> =>
  Object.fromEntries(
    Object.entries(req.headers).flatMap(([k, v]) => (v === undefined ? [] : [[k, Array.isArray(v) ? v.join(', ') : v]])),
  )

const serveApi = async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> => {
  const headers = headersOf(req)
  const apiReq: ApiRequest = {
    method: (req.method ?? 'GET').toUpperCase(),
    path: stripApiPrefix(url.pathname),
    query: Object.fromEntries(url.searchParams),
    headers,
    cookies: parseCookies(headers.cookie ? [headers.cookie] : []),
    body: await readBody(req),
    ip: req.socket.remoteAddress ?? '127.0.0.1',
    requestId: randomUUID(),
  }
  const result = await app(apiReq)
  res.writeHead(result.status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...(result.cookies ? { 'set-cookie': [...result.cookies] } : {}),
  })
  res.end(JSON.stringify(result.body))
}

const serveObject = async (res: ServerResponse, key: string): Promise<void> => {
  const object = await deps.storage.get(key)
  if (!object) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Not found')
    return
  }
  res.writeHead(200, { 'content-type': object.contentType, 'cache-control': 'no-cache' })
  res.end(Buffer.from(object.body))
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  const path = url.pathname
  const work =
    path === '/api' || path.startsWith('/api/')
      ? serveApi(req, res, url)
      : path.startsWith('/data/') || path.startsWith('/media/')
        ? serveObject(res, path.slice(1))
        : serveObject(res, '\u0000missing')
  work.catch((err: unknown) => {
    deps.log.error('dev server error', { errorMessage: err instanceof Error ? err.message : String(err) })
    if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ ok: false, error: 'server' }))
  })
})

// SEED_IMPORT=1 (make run's default) adds the register charities of data/imported-charities.json.
const imported = process.env.SEED_IMPORT === '1' ? loadImportedFile() : []
// SEED_DEMO_NEEDS=1 (make run's default) gives a quarter of them made-up needs, as the demo-needs task does on dev.
const demoNeeds = process.env.SEED_DEMO_NEEDS === '1' ? { fraction: DEFAULT_DEMO_FRACTION, seed: DEFAULT_DEMO_SEED } : undefined
await seedDev(deps, { imported, ...(demoNeeds === undefined ? {} : { demoNeeds }) })
server.listen(PORT, () => {
  out(`Dod ar prieku API (local) on http://localhost:${PORT}`)
  out(`  admin:   ${DEV_ADMIN_EMAIL} / ${DEV_PASSWORD}`)
  out(`  charity: ${DEV_CHARITY_EMAIL} / ${DEV_PASSWORD}`)
  out(`  imported register charities: ${imported.length}${imported.length === 0 ? ' (SEED_IMPORT=1 adds them)' : ''}`)
  if (demoNeeds !== undefined && imported.length > 0) out('  demo needs: on for a quarter of them (SEED_DEMO_NEEDS=0 leaves them without)')
})
