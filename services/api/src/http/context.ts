/** The per-request context handlers receive, and the helpers they share. */
import type { Deps } from '../deps'
import type { Logger } from '../log'
import { ApiError } from './errors'
import type { Params } from './router'
import type { ApiRequest } from './types'

export interface Ctx {
  readonly req: ApiRequest
  readonly params: Params
  readonly deps: Deps
  readonly log: Logger
  /** The parsed JSON body; `{}` when empty. Throws bad_request on malformed JSON. */
  readonly json: () => unknown
}

export interface HandlerResult {
  readonly data: unknown
  readonly status?: number
  readonly cookies?: readonly string[]
}

export type Handler = (ctx: Ctx) => Promise<HandlerResult>

export interface RouteDef {
  readonly handle: Handler
  /** Bytes; defaults to DEFAULT_MAX_BODY. */
  readonly maxBody?: number
}

export const ok = (data: unknown, cookies?: readonly string[]): HandlerResult => (cookies ? { data, cookies } : { data })

export const parseJson = (body: string): unknown => {
  if (body.trim() === '') return {}
  try {
    return JSON.parse(body) as unknown
  } catch {
    throw new ApiError('bad_request')
  }
}

export const param = (ctx: Ctx, name: string): string => {
  const v = ctx.params[name]
  if (v === undefined) throw new ApiError('bad_request')
  return v
}

/** Rejects anything that is not a JSON object (arrays and primitives included). */
export const objectBody = (ctx: Ctx): Readonly<Record<string, unknown>> => {
  const body = ctx.json()
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new ApiError('bad_request')
  return body as Readonly<Record<string, unknown>>
}
