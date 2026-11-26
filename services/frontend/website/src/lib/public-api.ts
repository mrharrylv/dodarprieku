/**
 * Every request the public pages make: the snapshot, a charity's stats, the
 * view count, pledges and the newsletter.
 *
 * Each call resolves to a `PublicResult`, never throws, and names its failure
 * precisely, because a visitor needs different things from each: a timeout
 * wants a retry, a rate limit wants a pause, a validation error wants a field
 * fixed. The UI maps `ApiFailure.kind` to copy (`errors.<kind>` in `charity`).
 */

import {
  CSRF_HEADER,
  CSRF_VALUE,
  SNAPSHOT_PATH,
  type CharityStats,
  type PledgeRequest,
  type PublicSnapshot,
  type SubscribeRequest,
} from '@shared/contracts'

import { REQUEST_TIMEOUT_MS } from '@/config/constants'
import { EMPTY_SNAPSHOT, parseSnapshot } from './snapshot'

export type ApiFailureKind = 'network' | 'timeout' | 'rate_limited' | 'validation' | 'not_found' | 'server'

export type ApiFailure =
  | { readonly kind: Exclude<ApiFailureKind, 'validation'> }
  | { readonly kind: 'validation'; readonly fields: Readonly<Record<string, string>> }

export type PublicResult<T> = { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: ApiFailure }

export const API_BASE = '/api'

const fail = <T>(error: ApiFailure): PublicResult<T> => ({ ok: false, error })

type Obj = Readonly<Record<string, unknown>>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)

const isFields = (v: unknown): v is Readonly<Record<string, string>> =>
  isObj(v) && Object.values(v).every((x) => typeof x === 'string')

/** An HTTP status and an `ApiResponse` error body, as one failure. */
export const failureFrom = (status: number, body: unknown): ApiFailure => {
  const code = isObj(body) ? body.error : undefined
  if (status === 429 || code === 'rate_limited') return { kind: 'rate_limited' }
  if (code === 'validation' || (status === 400 && isObj(body) && isFields(body.fields))) {
    return { kind: 'validation', fields: isObj(body) && isFields(body.fields) ? body.fields : {} }
  }
  if (status === 404 || code === 'not_found') return { kind: 'not_found' }
  if (status === 400) return { kind: 'validation', fields: {} }
  return { kind: 'server' }
}

const readBody = async (response: Response): Promise<unknown> => {
  try {
    return await response.json()
  } catch {
    // A body that is not JSON (an HTML error page from the edge) is treated
    // as no body: the status alone then decides the failure.
    return undefined
  }
}

interface RequestOptions {
  readonly method?: 'GET' | 'POST'
  readonly body?: unknown
  readonly fetcher?: typeof fetch
  readonly timeoutMs?: number
}

/** One request with a timeout, its failure classified. `raw` hands back the parsed body. */
export const request = async (url: string, options: RequestOptions = {}): Promise<PublicResult<unknown>> => {
  const { method = 'GET', body, fetcher = fetch, timeoutMs = REQUEST_TIMEOUT_MS } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (method !== 'GET') {
      headers['Content-Type'] = 'application/json'
      headers[CSRF_HEADER] = CSRF_VALUE
    }
    const response = await fetcher(url, {
      method,
      headers,
      signal: controller.signal,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
    const parsed = await readBody(response)
    if (!response.ok) return fail(failureFrom(response.status, parsed))
    return { ok: true, data: parsed }
  } catch (error) {
    if (controller.signal.aborted) return fail({ kind: 'timeout' })
    if (error instanceof DOMException && error.name === 'AbortError') return fail({ kind: 'timeout' })
    return fail({ kind: 'network' })
  } finally {
    clearTimeout(timer)
  }
}

/** The data of an `ApiResponse` envelope, checked by `isData`. */
const unwrap = <T>(result: PublicResult<unknown>, isData: (v: unknown) => v is T): PublicResult<T> => {
  if (!result.ok) return result
  const body = result.data
  if (isObj(body) && body.ok === true && isData(body.data)) return { ok: true, data: body.data }
  return fail({ kind: 'server' })
}

const isAnything = (_v: unknown): _v is Readonly<Record<string, never>> => true

/**
 * The snapshot. A missing file (403 or 404 from the bucket before the first
 * publish) is an empty map, not an error.
 */
export const fetchSnapshot = async (fetcher?: typeof fetch): Promise<PublicResult<PublicSnapshot>> => {
  const base = fetcher ?? fetch
  // An S3 origin without ListBucket answers 403 for a missing key. On this one
  // file that means "not published yet"; elsewhere 403 keeps its meaning.
  const snapshotFetcher: typeof fetch = async (input, init) => {
    const response = await base(input, init)
    return response.status === 403 ? new Response(null, { status: 404 }) : response
  }
  const result = await request(SNAPSHOT_PATH, { fetcher: snapshotFetcher })
  if (!result.ok) return result.error.kind === 'not_found' ? { ok: true, data: EMPTY_SNAPSHOT } : result
  const snapshot = parseSnapshot(result.data)
  return snapshot === null ? fail({ kind: 'server' }) : { ok: true, data: snapshot }
}

const charityUrl = (id: string, tail: string): string => `${API_BASE}/charities/${encodeURIComponent(id)}/${tail}`

export const isCharityStats = (v: unknown): v is CharityStats =>
  isObj(v) &&
  typeof v.views === 'number' &&
  typeof v.pledges === 'number' &&
  isObj(v.pledgesByNeed) &&
  Object.values(v.pledgesByNeed).every((n) => typeof n === 'number') &&
  Array.isArray(v.recentSupporters) &&
  v.recentSupporters.every(
    (s) => isObj(s) && typeof s.name === 'string' && typeof s.at === 'string' && (s.company === undefined || typeof s.company === 'string'),
  )

export const fetchStats = async (id: string, fetcher?: typeof fetch): Promise<PublicResult<CharityStats>> =>
  unwrap(await request(charityUrl(id, 'stats'), fetcher ? { fetcher } : {}), isCharityStats)

export const postView = async (id: string, fetcher?: typeof fetch): Promise<PublicResult<unknown>> =>
  unwrap(await request(charityUrl(id, 'view'), { method: 'POST', body: {}, ...(fetcher ? { fetcher } : {}) }), isAnything)

const isIdBody = (v: unknown): v is { readonly id: string } => isObj(v) && typeof v.id === 'string'

export const postPledge = async (
  id: string,
  pledge: PledgeRequest,
  fetcher?: typeof fetch,
): Promise<PublicResult<{ readonly id: string }>> =>
  unwrap(await request(charityUrl(id, 'pledges'), { method: 'POST', body: pledge, ...(fetcher ? { fetcher } : {}) }), isIdBody)

export const postSubscribe = async (
  subscription: SubscribeRequest,
  fetcher?: typeof fetch,
): Promise<PublicResult<unknown>> =>
  unwrap(
    await request(`${API_BASE}/subscribe`, { method: 'POST', body: subscription, ...(fetcher ? { fetcher } : {}) }),
    isAnything,
  )
