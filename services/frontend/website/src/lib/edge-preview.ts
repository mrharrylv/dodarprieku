/**
 * What `make preview` answers for a request, decided the way CloudFront
 * decides it: by the site's own viewer-request function
 * (infrastructure/terraform/functions/viewer-request.js), evaluated as it is.
 *
 * Build-time only: the edge-preview plugin in vite.config.ts calls it, and
 * the browser bundle never imports it. Pure, so the preview's behaviour is
 * tested without starting a server.
 */

/** One query-string field, as CloudFront Functions see it. */
export interface EdgeQueryField {
  readonly value: string
  /** Every value, the first included, when the name was sent more than once. */
  readonly multiValue?: ReadonlyArray<{ readonly value: string }>
}

export type EdgeQuery = Readonly<Record<string, EdgeQueryField>>

export interface EdgeRequest {
  readonly method: string
  readonly uri: string
  readonly querystring: EdgeQuery
  readonly headers: Readonly<Record<string, { readonly value: string }>>
  readonly cookies: Readonly<Record<string, { readonly value: string }>>
}

/** A response the function answers with itself: a redirect. */
export interface EdgeResponse {
  readonly statusCode: number
  readonly headers?: Readonly<Record<string, { readonly value: string }>>
}

export type ViewerRequestHandler = (event: { readonly request: EdgeRequest }) => EdgeRequest | EdgeResponse

export type EdgeAnswer =
  /** The function answered: send this status and these headers, no body. */
  | { readonly kind: 'response'; readonly status: number; readonly headers: Readonly<Record<string, string>> }
  /** Serve this file from the build: the rewritten path, then the query string. */
  | { readonly kind: 'file'; readonly url: string }
  /** No such file: the bucket's 403, which the distribution answers with 404.html. */
  | { readonly kind: 'missing' }

/**
 * A query string in CloudFront Functions' shape: one field per name, each
 * value exactly as it was sent (still percent-encoded), and a name sent more
 * than once collected into `multiValue`.
 */
export const parseQuery = (search: string): EdgeQuery => {
  const pairs = search
    .replace(/^\?/, '')
    .split('&')
    .filter((part) => part !== '')
    .map((part): readonly [string, string] => {
      const at = part.indexOf('=')
      return at === -1 ? [part, ''] : [part.slice(0, at), part.slice(at + 1)]
    })
  const names = [...new Set(pairs.map(([name]) => name))]

  return Object.fromEntries(
    names.map((name): [string, EdgeQueryField] => {
      const values = pairs.filter(([candidate]) => candidate === name).map(([, value]) => ({ value }))
      const first = values[0]?.value ?? ''
      return [name, values.length > 1 ? { value: first, multiValue: values } : { value: first }]
    }),
  )
}

/** The path as a file name, or null when its percent-encoding is malformed. */
const decodedPath = (uri: string): string | null => {
  try {
    return decodeURIComponent(uri)
  } catch {
    // `/en/%E0%A4%A` names no key the bucket could hold; CloudFront answers
    // it with 404.html, and so does the preview.
    return null
  }
}

/**
 * The preview's answer to one request.
 *
 * `target` is the request line's raw path and query (Node's `req.url`), not
 * a parsed URL: a URL parser reads `//en//about` as the host `en`, and the
 * function has to see what CloudFront would. `hasFile` says whether the
 * build holds a file at a decoded path.
 */
export const edgeAnswer = (
  handler: ViewerRequestHandler,
  target: string,
  hasFile: (path: string) => boolean,
): EdgeAnswer => {
  const withoutFragment = target.split('#')[0] ?? ''
  const at = withoutFragment.indexOf('?')
  const uri = (at === -1 ? withoutFragment : withoutFragment.slice(0, at)) || '/'
  const search = at === -1 ? '' : withoutFragment.slice(at)

  const result = handler({
    request: { method: 'GET', uri, querystring: parseQuery(search), headers: {}, cookies: {} },
  })

  if ('statusCode' in result) {
    const headers = Object.fromEntries(Object.entries(result.headers ?? {}).map(([name, field]) => [name, field.value]))
    return { kind: 'response', status: result.statusCode, headers }
  }

  const path = decodedPath(result.uri)
  return path !== null && hasFile(path) ? { kind: 'file', url: `${result.uri}${search}` } : { kind: 'missing' }
}
