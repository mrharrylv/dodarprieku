/**
 * API Gateway HTTP API (payload 2.0) <-> ApiRequest / ApiResult.
 */
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { parseCookies } from './cookies'
import type { ApiRequest, ApiResult } from './types'

const API_PREFIX = '/api'

/** CloudFront forwards /api/* unchanged; the routes are written below /api. */
export const stripApiPrefix = (path: string): string => {
  if (path === API_PREFIX) return '/'
  return path.startsWith(`${API_PREFIX}/`) ? path.slice(API_PREFIX.length) : path
}

const lowerHeaders = (headers: Readonly<Record<string, string | undefined>> | undefined): Record<string, string> =>
  Object.fromEntries(
    Object.entries(headers ?? {}).flatMap(([k, v]) => (v === undefined ? [] : [[k.toLowerCase(), v]])),
  )

/**
 * The visitor's address. Behind CloudFront the socket address is an edge
 * server, so prefer CloudFront-Viewer-Address ("ip:port"), then the LAST
 * X-Forwarded-For entry (the one CloudFront appended; earlier ones are
 * whatever the client sent), then the socket.
 */
export const clientIp = (headers: Readonly<Record<string, string>>, sourceIp: string): string => {
  const viewer = headers['cloudfront-viewer-address']
  if (viewer) {
    const colon = viewer.lastIndexOf(':')
    return colon > 0 ? viewer.slice(0, colon) : viewer
  }
  const xff = headers['x-forwarded-for']
  if (xff) {
    const last = xff.split(',').map((s) => s.trim()).filter((s) => s !== '').pop()
    if (last) return last
  }
  return sourceIp
}

export const fromEvent = (event: APIGatewayProxyEventV2): ApiRequest => {
  const headers = lowerHeaders(event.headers)
  const cookieSources = [...(event.cookies ?? []), ...(headers.cookie ? [headers.cookie] : [])]
  const body = event.body === undefined ? '' : event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body
  return {
    method: event.requestContext.http.method.toUpperCase(),
    path: stripApiPrefix(event.rawPath || event.requestContext.http.path),
    query: Object.fromEntries(
      Object.entries(event.queryStringParameters ?? {}).flatMap(([k, v]) => (v === undefined ? [] : [[k, v]])),
    ),
    headers,
    cookies: parseCookies(cookieSources),
    body,
    ip: clientIp(headers, event.requestContext.http.sourceIp),
    requestId: event.requestContext.requestId,
  }
}

const BASE_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
} as const

export const toResponse = (result: ApiResult): APIGatewayProxyStructuredResultV2 => ({
  statusCode: result.status,
  headers: { ...BASE_HEADERS },
  body: JSON.stringify(result.body),
  ...(result.cookies && result.cookies.length > 0 ? { cookies: [...result.cookies] } : {}),
})
