// Run with: node --test infrastructure/terraform/functions/not-found/
// node:test, so the infrastructure needs no package of its own.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createBucketFetch, createHandler, FALLBACK_PAGE, PAGE_TTL_MS } from './index.mjs'

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

test('starts loading the S3 SDK at init, and builds one client for every read', async () => {
  let loads = 0
  let clients = 0
  const sent = []
  const sdk = {
    S3Client: class { constructor() { clients++ } async send(cmd) { sent.push(cmd.input); return { Body: { transformToString: async () => PAGE } } } },
    GetObjectCommand: class { constructor(input) { this.input = input } },
  }
  const fetchPage = createBucketFetch({ env: { WEBSITE_BUCKET: 'site', PAGE_KEY: '404.html' }, loadSdk: async () => (loads++, sdk) })
  assert.equal(loads, 1, 'the import begins before the first request')
  assert.equal(await fetchPage(), PAGE)
  assert.equal(await fetchPage(), PAGE)
  assert.equal(loads, 1)
  assert.equal(clients, 1)
  assert.deepEqual(sent, [{ Bucket: 'site', Key: '404.html' }, { Bucket: 'site', Key: '404.html' }])
})

test('a fetcher without a bucket loads nothing and fails each read', async () => {
  let loads = 0
  const fetchPage = createBucketFetch({ env: {}, loadSdk: async () => { loads++ } })
  await assert.rejects(fetchPage(), /WEBSITE_BUCKET is not set/)
  assert.equal(loads, 0)
})

// Cold starts at 128 MB took 4.4-5.5 s against a 5 s timeout, and the
// timed-out ones reached viewers as a JSON 502 (dev, 2026-11-27).
test('the function has room for a cold start, and a 5xx is never cached at the edge', () => {
  const tf = readFileSync(new URL('../../not_found.tf', import.meta.url), 'utf8')
  const fn = tf.slice(tf.indexOf('resource "aws_lambda_function" "not_found"'))
  const memory = Number(/memory_size\s*=\s*(\d+)/.exec(fn)[1])
  const timeout = Number(/timeout\s*=\s*(\d+)/.exec(fn)[1])
  assert.ok(memory >= 512, `memory_size ${memory}`)
  assert.ok(timeout >= 10, `timeout ${timeout}`)
  const main = readFileSync(new URL('../../main.tf', import.meta.url), 'utf8')
  for (const code of [500, 502, 503, 504]) {
    const block = new RegExp(`custom_error_response\\s*{\\s*error_code\\s*=\\s*${code}\\s*error_caching_min_ttl\\s*=\\s*0\\s*}`)
    assert.match(main, block, `custom_error_response for ${code} with ttl 0`)
  }
})
