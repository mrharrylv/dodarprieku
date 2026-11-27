/**
 * The request pipeline, independent of Lambda: origin verify -> route -> CSRF and origin
 * checks -> body size -> handler -> ApiResponse envelope. Every failure is an
 * error code; nothing internal reaches the response.
 */
import { timingSafeEqual } from 'node:crypto'
import { CSRF_HEADER, CSRF_VALUE, type ApiResponse } from '../../shared/src/contracts'
import { isAllowedOrigin } from './config'
import type { Deps } from './deps'
import { parseJson, type Ctx, type RouteDef } from './http/context'
import { ApiError } from './http/errors'
import { matchRoute, type Route } from './http/router'
import type { ApiRequest, ApiResult } from './http/types'
import { errorFields } from './log'
import { ROUTES } from './routes'

export const DEFAULT_MAX_BODY = 256 * 1024
const MUTATING = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])

const errorResult = (err: ApiError): ApiResult => {
  const body: ApiResponse<never> = { ok: false, error: err.code, ...(err.fields ? { fields: err.fields } : {}) }
  return { status: err.status, body }
}

/** CSRF: a custom header a cross-site form cannot send, and a known Origin when the browser gives one. */
const checkMutation = (deps: Deps, req: ApiRequest): void => {
  if (!MUTATING.has(req.method)) return
  if (req.headers[CSRF_HEADER] !== CSRF_VALUE) throw new ApiError('forbidden')
  const origin = req.headers.origin
  if (origin !== undefined && !isAllowedOrigin(deps.config, origin)) throw new ApiError('forbidden')
}

/**
 * The request came through CloudFront, which adds the origin-verify header
 * (main.tf). Only then is CloudFront-Viewer-Address, the rate-limit key,
 * set by the edge rather than by the caller. No secret configured (local
 * only, loadConfig enforces it) means no check.
 */
const checkOriginVerify = (deps: Deps, req: ApiRequest): void => {
  const { originVerifyHeader, originVerifySecret } = deps.config
  if (originVerifySecret === '') return
  const given = Buffer.from(req.headers[originVerifyHeader] ?? '')
  const expected = Buffer.from(originVerifySecret)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new ApiError('forbidden')
}

export type App = (req: ApiRequest) => Promise<ApiResult>

export const createApp = (deps: Deps, routes: readonly Route<RouteDef>[] = ROUTES): App => async (req) => {
  const log = deps.log.child({ requestId: req.requestId, method: req.method, path: req.path })
  const started = Date.now()
  try {
    checkOriginVerify(deps, req)
    const match = matchRoute(routes, req.method, req.path)
    if (match.kind !== 'found') throw new ApiError('not_found')
    checkMutation(deps, req)
    if (Buffer.byteLength(req.body) > (match.handler.maxBody ?? DEFAULT_MAX_BODY)) throw new ApiError('too_large')
    let parsed: { value: unknown } | undefined
    const ctx: Ctx = {
      req,
      params: match.params,
      deps,
      log,
      json: () => {
        parsed ??= { value: parseJson(req.body) }
        return parsed.value
      },
    }
    const result = await match.handler.handle(ctx)
    const status = result.status ?? 200
    log.info('request', { status, ms: Date.now() - started })
    const body: ApiResponse<unknown> = { ok: true, data: result.data }
    return { status, body, ...(result.cookies ? { cookies: result.cookies } : {}) }
  } catch (err) {
    if (err instanceof ApiError) {
      log.info('request', { status: err.status, error: err.code, ms: Date.now() - started })
      return errorResult(err)
    }
    log.error('unhandled error', { ...errorFields(err), ms: Date.now() - started })
    return errorResult(new ApiError('server'))
  }
}
