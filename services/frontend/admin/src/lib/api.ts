/**
 * The typed client over the shared contracts. Every call resolves to the
 * envelope's `data` or throws an ApiError whose `code` the UI maps to copy
 * (errors.ts). Mutations carry the CSRF header; a 401 on anything but the
 * login and session probe tells the auth context the session has expired.
 */
import {
  CSRF_HEADER,
  CSRF_VALUE,
  type AdminCharityDetail,
  type AdminCharitySummary,
  type ApiErrorCode,
  type CharityProfile,
  type CharityStatus,
  type ListRequestRecord,
  type LoginRequest,
  type Me,
  type PledgeRecord,
  type SetPasswordRequest,
  type SubscriberRecord,
  type UploadRequest,
  type UploadResponse,
} from '@shared/contracts'

export type ClientErrorCode = ApiErrorCode | 'network' | 'timeout'

export class ApiError extends Error {
  readonly code: ClientErrorCode
  readonly status: number
  readonly fields: Readonly<Record<string, string>>

  constructor(code: ClientErrorCode, status: number, fields: Readonly<Record<string, string>> = {}) {
    super(code)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.fields = fields
  }
}

export const isApiError = (value: unknown): value is ApiError => value instanceof ApiError

/** Mail results the API may add to approve and resend-invite (optional). */
export interface MailResult {
  readonly mailSent?: boolean
}

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

export const REQUEST_TIMEOUT_MS = 20_000
const API_BASE = '/api'
/** A 401 here means "not logged in", not "your session just expired". */
const SESSION_PROBES = new Set(['/auth/login', '/auth/me', '/auth/set-password'])

const ERROR_CODES: readonly ApiErrorCode[] = [
  'bad_request', 'validation', 'unauthorized', 'forbidden', 'not_found',
  'conflict', 'rate_limited', 'token_invalid', 'too_large', 'server',
]

/** When the body is not our envelope (a gateway page, an empty 502). */
export const codeForStatus = (status: number): ApiErrorCode => {
  if (status === 400) return 'bad_request'
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not_found'
  if (status === 409) return 'conflict'
  if (status === 413) return 'too_large'
  if (status === 429) return 'rate_limited'
  return 'server'
}

const isRecord = (v: unknown): v is Readonly<Record<string, unknown>> => typeof v === 'object' && v !== null

const stringFields = (v: unknown): Readonly<Record<string, string>> =>
  isRecord(v) ? Object.fromEntries(Object.entries(v).filter((e): e is [string, string] => typeof e[1] === 'string')) : {}

/** Turns a status and a parsed body (or undefined) into data or an ApiError. */
export const interpret = <T>(status: number, body: unknown): T => {
  if (isRecord(body) && body.ok === true && 'data' in body) {
    if (status >= 200 && status < 300) return body.data as T
  }
  if (isRecord(body) && body.ok === false && ERROR_CODES.includes(body.error as ApiErrorCode)) {
    throw new ApiError(body.error as ApiErrorCode, status, stringFields(body.fields))
  }
  throw new ApiError(status >= 200 && status < 300 ? 'server' : codeForStatus(status), status)
}

export interface ClientOptions {
  readonly fetchImpl?: typeof fetch
  readonly timeoutMs?: number
  readonly onUnauthorized?: () => void
}

export interface Client {
  request<T>(method: Method, path: string, body?: unknown): Promise<T>
  setUnauthorizedHandler(handler: (() => void) | undefined): void
}

export const createClient = (options: ClientOptions = {}): Client => {
  let onUnauthorized = options.onUnauthorized
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS

  const request = async <T>(method: Method, path: string, body?: unknown): Promise<T> => {
    const doFetch = options.fetchImpl ?? globalThis.fetch
    const headers: Record<string, string> = { accept: 'application/json' }
    if (method !== 'GET') headers[CSRF_HEADER] = CSRF_VALUE
    if (body !== undefined) headers['content-type'] = 'application/json'
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    let response: Response
    try {
      response = await doFetch(`${API_BASE}${path}`, {
        method,
        headers,
        credentials: 'same-origin',
        signal: controller.signal,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
    } catch {
      throw new ApiError(controller.signal.aborted ? 'timeout' : 'network', 0)
    } finally {
      clearTimeout(timer)
    }
    const parsed: unknown = await response.json().catch(() => undefined)
    try {
      return interpret<T>(response.status, parsed)
    } catch (error) {
      const probe = SESSION_PROBES.has(path.split('?')[0] ?? path)
      if (isApiError(error) && error.code === 'unauthorized' && !probe) onUnauthorized?.()
      throw error
    }
  }

  return {
    request,
    setUnauthorizedHandler: (handler) => {
      onUnauthorized = handler
    },
  }
}

const enc = encodeURIComponent
const query = (params: Readonly<Record<string, string | undefined>>): string => {
  const entries = Object.entries(params).filter((e): e is [string, string] => e[1] !== undefined && e[1] !== '')
  return entries.length === 0 ? '' : `?${new URLSearchParams(entries).toString()}`
}

/** Every endpoint the portal calls, typed by the shared contracts. */
export const endpoints = (c: Client) => ({
  me: () => c.request<Me>('GET', '/auth/me'),
  login: (body: LoginRequest) => c.request<Me>('POST', '/auth/login', body),
  logout: () => c.request<Record<string, never>>('POST', '/auth/logout'),
  setPassword: (body: SetPasswordRequest) => c.request<Me>('POST', '/auth/set-password', body),

  charities: (status?: CharityStatus) => c.request<AdminCharitySummary[]>('GET', `/admin/charities${query({ status })}`),
  charity: (id: string) => c.request<AdminCharityDetail>('GET', `/admin/charities/${enc(id)}`),
  saveProfile: (id: string, profile: CharityProfile) =>
    c.request<AdminCharityDetail>('PUT', `/admin/charities/${enc(id)}/profile`, profile),
  approve: (id: string) => c.request<AdminCharityDetail & MailResult>('POST', `/admin/charities/${enc(id)}/approve`),
  reject: (id: string, reason?: string) =>
    c.request<AdminCharityDetail>('POST', `/admin/charities/${enc(id)}/reject`, reason ? { reason } : {}),
  suspend: (id: string, reason?: string) =>
    c.request<AdminCharityDetail>('POST', `/admin/charities/${enc(id)}/suspend`, reason ? { reason } : {}),
  restore: (id: string) => c.request<AdminCharityDetail>('POST', `/admin/charities/${enc(id)}/restore`),
  resendInvite: (id: string) => c.request<MailResult>('POST', `/admin/charities/${enc(id)}/resend-invite`),
  approveUpdate: (id: string) => c.request<AdminCharityDetail>('POST', `/admin/charities/${enc(id)}/update/approve`),
  rejectUpdate: (id: string, reason?: string) =>
    c.request<AdminCharityDetail>('POST', `/admin/charities/${enc(id)}/update/reject`, reason ? { reason } : {}),
  remove: (id: string) => c.request<Record<string, never>>('DELETE', `/admin/charities/${enc(id)}`),

  subscribers: () => c.request<SubscriberRecord[]>('GET', '/admin/subscribers'),
  pledges: (charityId?: string) => c.request<PledgeRecord[]>('GET', `/admin/pledges${query({ charityId })}`),
  listRequests: () => c.request<ListRequestRecord[]>('GET', '/admin/list-requests'),
  listRequestDone: (charityId: string, id: string) =>
    c.request<ListRequestRecord>('POST', `/admin/list-requests/${enc(charityId)}/${enc(id)}/done`),
  upload: (body: UploadRequest) => c.request<UploadResponse>('POST', '/uploads', body),
})

export type Api = ReturnType<typeof endpoints>

export const client = createClient()
export const api: Api = endpoints(client)
