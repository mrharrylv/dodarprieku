import type { ApiErrorCode } from '../../../shared/src/contracts'
import type { FieldErrors } from '../../../shared/src/validate'

const STATUS: Readonly<Record<ApiErrorCode, number>> = {
  bad_request: 400,
  validation: 400,
  token_invalid: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  too_large: 413,
  rate_limited: 429,
  server: 500,
}

/** Thrown by handlers; the app turns it into an ApiResponse error envelope. */
export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly fields: FieldErrors | undefined

  constructor(code: ApiErrorCode, fields?: FieldErrors) {
    super(code)
    this.name = 'ApiError'
    this.code = code
    this.status = STATUS[code]
    this.fields = fields
  }
}

export const validationError = (fields: FieldErrors): ApiError => new ApiError('validation', fields)
export const notFound = (): ApiError => new ApiError('not_found')
export const conflict = (): ApiError => new ApiError('conflict')
