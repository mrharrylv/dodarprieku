// Run with: node --test infrastructure/terraform/functions/not-found/
// node:test, so the infrastructure needs no package of its own.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHandler, FALLBACK_PAGE, PAGE_TTL_MS } from './index.mjs'

const PAGE = '<!doctype html><html lang="lv"><title>404</title></html>'
const quiet = () => {}

test('answers with the bucket page and status 404', async () => {
  const handler = createHandler({ fetchPage: async () => PAGE, log: quiet })
  const res = await handler()
  assert.equal(res.statusCode, 404)
  assert.equal(res.body, PAGE)
  assert.equal(res.headers['content-type'], 'text/html; charset=utf-8')
  assert.equal(res.headers['cache-control'], 'no-cache')
})

test('reads the bucket once within the cache window', async () => {
  let reads = 0
  let clock = 1000
  const handler = createHandler({ fetchPage: async () => (reads++, PAGE), now: () => clock, log: quiet })
  await handler()
  clock += PAGE_TTL_MS - 1
  await handler()
  assert.equal(reads, 1)
  clock += 1
  await handler()
  assert.equal(reads, 2)
})

test('serves the built-in page, still 404, when the bucket cannot be read', async () => {
  const logged = []
  const handler = createHandler({
    fetchPage: async () => { throw new Error('AccessDenied') },
    log: (message, error) => logged.push([message, error.message]),
  })
  const res = await handler()
  assert.equal(res.statusCode, 404)
  assert.equal(res.body, FALLBACK_PAGE)
  assert.equal(logged.length, 1)
  assert.equal(logged[0][1], 'AccessDenied')
})

test('treats an empty page as a failure', async () => {
  const handler = createHandler({ fetchPage: async () => '', log: quiet })
  assert.equal((await handler()).body, FALLBACK_PAGE)
})

test('keeps serving the last good page when a later read fails', async () => {
  let clock = 0
  let fail = false
  const handler = createHandler({
    fetchPage: async () => { if (fail) throw new Error('down'); return PAGE },
    now: () => clock,
    log: quiet,
  })
  await handler()
  fail = true
  clock += PAGE_TTL_MS
  assert.equal((await handler()).body, PAGE)
})

test('the built-in page is Latvian, without em dashes, and links home', () => {
  assert.match(FALLBACK_PAGE, /lang="lv"/)
  assert.match(FALLBACK_PAGE, /href="\/"/)
  assert.doesNotMatch(FALLBACK_PAGE, /\u2014/)
})
