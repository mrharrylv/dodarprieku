import type { ApiErrorCode } from '../../../shared/src/contracts'

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

/** The request as the handlers see it, independent of the API Gateway event shape. */
export interface ApiRequest {
  readonly method: string
  /** Path below /api, e.g. "/charities/abc/stats". */
  readonly path: string
  readonly query: Readonly<Record<string, string>>
  /** Lower-cased header names. */
  readonly headers: Readonly<Record<string, string>>
  readonly cookies: Readonly<Record<string, string>>
  readonly body: string
  readonly ip: string
  readonly requestId: string
}

export interface ApiResult {
  readonly status: number
  readonly body: unknown
  readonly cookies?: readonly string[]
}

export interface ErrorShape {
  readonly status: number
  readonly code: ApiErrorCode
  readonly fields?: Readonly<Record<string, string>>
}
