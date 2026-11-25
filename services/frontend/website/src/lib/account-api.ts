/**
 * The browser side of the registration and account API (doc/specs/dodarprieku.md).
 *
 * Every call goes through `apiRequest`, which never throws: a timeout, a lost
 * connection, a body that is not the `ApiResponse` envelope and every error
 * code the API sends each come back as their own `error` value, so a page can
 * show the copy that fits instead of a spinner that never ends.
 */

import {
  CSRF_HEADER,
  CSRF_VALUE,
  type AccountView,
  type ApiErrorCode,
  type ApplicationRequest,
  type ApplicationResponse,
  type CharityProfile,
  type ListRequestRecord,
  type Me,
  type PledgeRecord,
  type UploadRequest,
  type UploadResponse,
} from '@shared/contracts'

import { REQUEST_TIMEOUT_MS } from '@/config/constants'

/** What a call can fail with: an API code, or a failure the API never got to answer. */
export type ApiFailureKind = ApiErrorCode | 'network' | 'timeout' | 'invalid_response'

export type ApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false
      readonly error: ApiFailureKind
      readonly status: number
      readonly fields?: Readonly<Record<string, string>>
    }

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

const API_ERROR_CODES: readonly ApiErrorCode[] = [
  'bad_request',
  'validation',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'rate_limited',
  'token_invalid',
  'too_large',
  'server',
]

const isRecord = (v: unknown): v is Readonly<Record<string, unknown>> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isStringMap = (v: unknown): v is Readonly<Record<string, string>> =>
  isRecord(v) && Object.values(v).every((x) => typeof x === 'string')

/** The status a response would carry when its body is unreadable. */
const fallbackError = (status: number): ApiFailureKind => {
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not_found'
  if (status === 413) return 'too_large'
  if (status === 429) return 'rate_limited'
  if (status >= 500) return 'server'
  return 'invalid_response'
}

/** Turns a parsed body into a result. Pure, so every branch is testable. */
export const interpretBody = <T>(status: number, body: unknown): ApiResult<T> => {
  if (!isRecord(body) || typeof body.ok !== 'boolean') return { ok: false, error: fallbackError(status), status }
  if (body.ok) return { ok: true, data: body.data as T }
  const error = API_ERROR_CODES.find((code) => code === body.error) ?? fallbackError(status)
  return isStringMap(body.fields) ? { ok: false, error, status, fields: body.fields } : { ok: false, error, status }
}

const headersFor = (method: Method, hasBody: boolean): Record<string, string> => ({
  accept: 'application/json',
  ...(hasBody ? { 'content-type': 'application/json' } : {}),
  ...(method === 'GET' ? {} : { [CSRF_HEADER]: CSRF_VALUE }),
})

export const apiRequest = async <T>(
  method: Method,
  path: string,
  body?: unknown,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<ApiResult<T>> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const init: RequestInit = {
    method,
    credentials: 'same-origin',
    headers: headersFor(method, body !== undefined),
    signal: controller.signal,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }
  try {
    const response = await globalThis.fetch(path, init)
    const parsed: unknown = await response.json().catch(() => undefined)
    return interpretBody<T>(response.status, parsed)
  } catch (err) {
    const aborted = controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')
    // A warning, not an error: the page shows the failure itself, and a lost
    // connection is the visitor's network, not a fault in the site.
    if (!aborted) console.warn(`[api] ${method} ${path} failed`, err)
    return { ok: false, error: aborted ? 'timeout' : 'network', status: 0 }
  } finally {
    clearTimeout(timer)
  }
}

export const API_PATHS = {
  applications: '/api/applications',
  uploads: '/api/uploads',
  login: '/api/auth/login',
  logout: '/api/auth/logout',
  me: '/api/auth/me',
  setPassword: '/api/auth/set-password',
  forgot: '/api/auth/forgot',
  account: '/api/account',
  profile: '/api/account/profile',
  pledges: '/api/account/pledges',
  listRequest: '/api/account/list-request',
} as const

export const submitApplication = (request: ApplicationRequest) =>
  apiRequest<ApplicationResponse>('POST', API_PATHS.applications, request)

export const uploadImage = (request: UploadRequest) => apiRequest<UploadResponse>('POST', API_PATHS.uploads, request)

export const login = (email: string, password: string) => apiRequest<Me>('POST', API_PATHS.login, { email, password })

export const logout = () => apiRequest<Record<string, never>>('POST', API_PATHS.logout)

export const fetchMe = () => apiRequest<Me>('GET', API_PATHS.me)

export const setPassword = (token: string, password: string) =>
  apiRequest<Me>('POST', API_PATHS.setPassword, { token, password })

export const forgotPassword = (email: string) => apiRequest<Record<string, never>>('POST', API_PATHS.forgot, { email })

export const fetchAccount = () => apiRequest<AccountView>('GET', API_PATHS.account)

export const saveProfile = (profile: CharityProfile) => apiRequest<AccountView>('PUT', API_PATHS.profile, profile)

export const fetchPledges = () => apiRequest<readonly PledgeRecord[]>('GET', API_PATHS.pledges)

export const requestSubscriberList = (message: string) =>
  apiRequest<ListRequestRecord>('POST', API_PATHS.listRequest, message.trim() === '' ? {} : { message: message.trim() })
