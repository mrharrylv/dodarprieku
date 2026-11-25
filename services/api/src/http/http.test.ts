import { describe, expect, it } from 'vitest'
import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { clearSessionCookie, parseCookies, sessionCookie } from './cookies'
import { ApiError } from './errors'
import { clientIp, fromEvent, stripApiPrefix, toResponse } from './event'
import { matchRoute, route } from './router'
import { objectBody, param, parseJson, type Ctx } from './context'

describe('router', () => {
  const routes = [
    route('GET /charities/:id/stats', 'stats'),
    route('POST /charities/:id/view', 'view'),
    route('GET /admin/list-requests', 'lists'),
    route('POST /admin/list-requests/:charityId/:id/done', 'done'),
  ]

  it('matches method and path, decoding params', () => {
    expect(matchRoute(routes, 'get', '/charities/a%20b/stats')).toEqual({ kind: 'found', handler: 'stats', params: { id: 'a b' } })
    expect(matchRoute(routes, 'POST', '/admin/list-requests/c1/r1/done')).toEqual({
      kind: 'found', handler: 'done', params: { charityId: 'c1', id: 'r1' },
    })
  })

  it('tolerates trailing and double slashes', () => {
    expect(matchRoute(routes, 'GET', '//admin/list-requests/').kind).toBe('found')
  })

  it('tells a wrong method from an unknown path', () => {
    expect(matchRoute(routes, 'DELETE', '/charities/x/stats').kind).toBe('method_not_allowed')
    expect(matchRoute(routes, 'GET', '/nope').kind).toBe('not_found')
    expect(matchRoute(routes, 'GET', '/charities/x/stats/extra').kind).toBe('not_found')
  })

  it('refuses a malformed escape in a param', () => {
    expect(matchRoute(routes, 'GET', '/charities/%E0%A4%A/stats').kind).toBe('not_found')
  })

  it('rejects a bad spec', () => {
    expect(() => route('GET', 'x')).toThrow()
  })
})

describe('cookies', () => {
  it('parses pairs from several sources, first wins', () => {
    expect(parseCookies(['a=1; b=2', 'a=3', 'junk', '=x', 'c= 4 '])).toEqual({ a: '1', b: '2', c: '4' })
  })

  it('builds the session cookie with and without Secure', () => {
    expect(sessionCookie('tok', true)).toBe('dodar_session=tok; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=604800')
    expect(sessionCookie('tok', false)).not.toContain('Secure')
    expect(clearSessionCookie(true)).toContain('Max-Age=0')
    expect(clearSessionCookie(false)).not.toContain('Secure')
  })
})

const event = (overrides: Partial<APIGatewayProxyEventV2> = {}): APIGatewayProxyEventV2 =>
  ({
    version: '2.0',
    routeKey: '$default',
    rawPath: '/api/charities/c1/stats',
    rawQueryString: 'status=pending',
    headers: { 'X-Dodar-Request': '1', 'x-forwarded-for': '1.1.1.1, 9.9.9.9' },
    queryStringParameters: { status: 'pending' },
    cookies: ['dodar_session=abc'],
    isBase64Encoded: false,
    body: '{"a":1}',
    requestContext: { http: { method: 'post', path: '/api/charities/c1/stats', sourceIp: '8.8.8.8' }, requestId: 'r-1' },
    ...overrides,
  }) as unknown as APIGatewayProxyEventV2

describe('event mapping', () => {
  it('strips /api', () => {
    expect(stripApiPrefix('/api')).toBe('/')
    expect(stripApiPrefix('/api/x')).toBe('/x')
    expect(stripApiPrefix('/x')).toBe('/x')
  })

  it('maps an HTTP API v2 event', () => {
    const req = fromEvent(event())
    expect(req).toMatchObject({
      method: 'POST',
      path: '/charities/c1/stats',
      query: { status: 'pending' },
      cookies: { dodar_session: 'abc' },
      body: '{"a":1}',
      ip: '9.9.9.9',
      requestId: 'r-1',
    })
    expect(req.headers['x-dodar-request']).toBe('1')
  })

  it('decodes a base64 body and reads a cookie header', () => {
    const req = fromEvent(
      event({ body: Buffer.from('hello').toString('base64'), isBase64Encoded: true, cookies: undefined, headers: { cookie: 'x=1' } } as never),
    )
    expect(req.body).toBe('hello')
    expect(req.cookies).toEqual({ x: '1' })
    expect(req.ip).toBe('8.8.8.8')
  })

  it('handles a missing body and query', () => {
    const req = fromEvent(event({ body: undefined, queryStringParameters: undefined, rawPath: '' } as never))
    expect(req.body).toBe('')
    expect(req.query).toEqual({})
    expect(req.path).toBe('/charities/c1/stats')
  })

  it('prefers CloudFront-Viewer-Address for the client ip', () => {
    expect(clientIp({ 'cloudfront-viewer-address': '5.6.7.8:443' }, 's')).toBe('5.6.7.8')
    expect(clientIp({ 'cloudfront-viewer-address': '2001:db8::1:443' }, 's')).toBe('2001:db8::1')
    expect(clientIp({ 'cloudfront-viewer-address': 'nocolon' }, 's')).toBe('nocolon')
    expect(clientIp({ 'x-forwarded-for': ' , ' }, 's')).toBe('s')
  })

  it('builds a JSON response with cookies only when present', () => {
    const res = toResponse({ status: 201, body: { ok: true }, cookies: ['a=1'] })
    expect(res).toMatchObject({ statusCode: 201, body: '{"ok":true}', cookies: ['a=1'] })
    expect(res.headers?.['cache-control']).toBe('no-store')
    expect(toResponse({ status: 200, body: {} }).cookies).toBeUndefined()
  })
})

describe('context helpers', () => {
  const ctx = (body: string, params = {}): Ctx =>
    ({ params, json: () => parseJson(body) }) as unknown as Ctx

  it('parses JSON, empty as {}, malformed as bad_request', () => {
    expect(parseJson('  ')).toEqual({})
    expect(parseJson('[1]')).toEqual([1])
    expect(() => parseJson('{')).toThrow(ApiError)
  })

  it('objectBody refuses arrays and primitives', () => {
    expect(objectBody(ctx('{"a":1}'))).toEqual({ a: 1 })
    expect(() => objectBody(ctx('[1]'))).toThrow(ApiError)
    expect(() => objectBody(ctx('3'))).toThrow(ApiError)
  })

  it('param throws on a missing name', () => {
    expect(param(ctx('', { id: 'x' }), 'id')).toBe('x')
    expect(() => param(ctx(''), 'id')).toThrow(ApiError)
  })
})
