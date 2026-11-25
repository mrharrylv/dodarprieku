/*
  The website's not-found page, with a real 404 status.

  CloudFront's origin group (main.tf) sends a request here when the website
  bucket has no such key (S3 behind OAC answers 403 for that). This function
  answers every such request with the bucket's prerendered 404.html and
  status 404, whatever the path.

  It replaces the distribution-wide custom error pages, which also rewrote
  the API's own 403 and 404 answers into this HTML page and lost their JSON
  error codes. Only the website's default behaviour fails over to here, so
  /api/*, /media/* and /data/* answers reach the viewer as their origin sent
  them.

  The page is kept in memory for PAGE_TTL_MS, so a burst of misses costs one
  S3 read. If the bucket cannot be read, a small built-in page is served
  instead, still with 404, and the error is logged.
*/

export const PAGE_TTL_MS = 5 * 60 * 1000

/* Served only when 404.html cannot be read. Latvian, like the site. */
export const FALLBACK_PAGE =
  '<!doctype html><html lang="lv"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1">' +
  '<meta name="robots" content="noindex">' +
  '<title>Lapa nav atrasta</title></head><body>' +
  '<h1>Lapa nav atrasta</h1>' +
  '<p>Šādas lapas nav. Iespējams, adrese ir mainījusies.</p>' +
  '<p><a href="/">Uz sākumlapu</a></p>' +
  '</body></html>'

const HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-cache',
}

const respond = (body) => ({ statusCode: 404, headers: HEADERS, body })

/*
  fetchPage: () => Promise<string>, the page's HTML.
  now:       () => number, milliseconds.
  log:       (message, error) => void.
*/
export function createHandler({ fetchPage, now = Date.now, ttlMs = PAGE_TTL_MS, log = console.error }) {
  let cached = null

  return async function handler() {
    const at = now()
    if (cached && at - cached.at < ttlMs) return respond(cached.body)

    try {
      const body = await fetchPage()
      if (typeof body !== 'string' || body === '') throw new Error('404 page is empty')
      cached = { body, at }
      return respond(body)
    } catch (error) {
      log('not-found: could not read the 404 page, serving the built-in one', error)
      return respond(cached ? cached.body : FALLBACK_PAGE)
    }
  }
}

async function fetchFromBucket() {
  const bucket = process.env.WEBSITE_BUCKET
  const key = process.env.PAGE_KEY || '404.html'
  if (!bucket) throw new Error('WEBSITE_BUCKET is not set')

  const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3')
  const client = new S3Client({})
  const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  return result.Body.transformToString('utf-8')
}

export const handler = createHandler({ fetchPage: fetchFromBucket })
