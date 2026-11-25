/**
 * A tiny router: "GET /charities/:id/stats" patterns, matched segment by
 * segment. No regex from user input, no wildcards; params are URI-decoded.
 */

export type Params = Readonly<Record<string, string>>

export interface Route<H> {
  readonly method: string
  readonly segments: readonly string[]
  readonly handler: H
}

export type Match<H> =
  | { readonly kind: 'found'; readonly handler: H; readonly params: Params }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'method_not_allowed' }

const split = (path: string): string[] => path.split('/').filter((s) => s !== '')

export const route = <H>(spec: string, handler: H): Route<H> => {
  const [method, path] = spec.split(' ')
  if (!method || !path) throw new Error(`Bad route spec: ${spec}`)
  return { method: method.toUpperCase(), segments: split(path), handler }
}

const decode = (s: string): string | undefined => {
  try {
    return decodeURIComponent(s)
  } catch {
    return undefined
  }
}

const matchSegments = (pattern: readonly string[], actual: readonly string[]): Params | undefined => {
  if (pattern.length !== actual.length) return undefined
  const params: Record<string, string> = {}
  for (const [i, seg] of pattern.entries()) {
    const value = actual[i] as string
    if (seg.startsWith(':')) {
      const decoded = decode(value)
      if (decoded === undefined || decoded === '') return undefined
      params[seg.slice(1)] = decoded
    } else if (seg !== value) {
      return undefined
    }
  }
  return params
}

export const matchRoute = <H>(routes: readonly Route<H>[], method: string, path: string): Match<H> => {
  const actual = split(path)
  let pathMatched = false
  for (const r of routes) {
    const params = matchSegments(r.segments, actual)
    if (!params) continue
    pathMatched = true
    if (r.method === method.toUpperCase()) return { kind: 'found', handler: r.handler, params }
  }
  return pathMatched ? { kind: 'method_not_allowed' } : { kind: 'not_found' }
}
