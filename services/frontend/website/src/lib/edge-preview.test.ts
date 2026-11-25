import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, it, expect, vi } from 'vitest'

import { edgeAnswer, parseQuery, type ViewerRequestHandler } from './edge-preview'

/**
 * What `make preview` answers (the edge-preview plugin in vite.config.ts),
 * run through the real CloudFront Function file, so the preview's 301s and
 * 404s are production's.
 */
const SOURCE = readFileSync(
  join(__dirname, '..', '..', '..', '..', '..', 'infrastructure', 'terraform', 'functions', 'viewer-request.js'),
  'utf8',
)
const handler = new Function(`${SOURCE}\nreturn handler`)() as ViewerRequestHandler

/** The files a build writes, by decoded path. */
const BUILT = new Set([
  '/index.html',
  '/par-projektu/index.html',
  '/organizacija/index.html',
  '/legal/privacy/index.html',
  '/og-image.png',
  '/par mums/index.html',
])
const hasFile = (path: string) => BUILT.has(path)

const answer = (target: string) => edgeAnswer(handler, target, hasFile)

/** The function's Cache-Control on every 301 and its 404: an hour, not for ever. */
const REDIRECT_CACHE = 'public, max-age=3600'

describe('edgeAnswer: the edge function decides', () => {
  it.each([
    ['/par-projektu/index.html', '/par-projektu'],
    ['//legal//privacy', '/legal/privacy'],
    ['/par-projektu/', '/par-projektu'],
    ['/index.html', '/'],
  ])('answers %s with a 301 to %s, as CloudFront does', (target, location) => {
    expect(answer(target)).toEqual({ kind: 'response', status: 301, headers: { location, 'cache-control': REDIRECT_CACHE } })
  })

  it('keeps the query string on a redirect, as the viewer sent it', () => {
    expect(answer('/par-projektu/?utm_source=x&q=a%20b&tag=1&tag=2&flag')).toEqual({
      kind: 'response',
      status: 301,
      headers: {
        location: '/par-projektu?utm_source=x&q=a%20b&tag=1&tag=2&flag',
        'cache-control': REDIRECT_CACHE,
      },
    })
  })

  it('reads the raw path, not one a URL parser has already tidied', () => {
    // new URL('//legal//privacy', base) takes "legal" for a host name.
    expect(answer('//legal//privacy?x=1')).toMatchObject({ headers: { location: '/legal/privacy?x=1' } })
  })

  it("serves a page's file, with the query string", () => {
    expect(answer('/par-projektu')).toEqual({ kind: 'file', url: '/par-projektu/index.html' })
    expect(answer('/legal/privacy?utm_source=x')).toEqual({ kind: 'file', url: '/legal/privacy/index.html?utm_source=x' })
    expect(answer('/')).toEqual({ kind: 'file', url: '/index.html' })
    expect(answer('/og-image.png')).toEqual({ kind: 'file', url: '/og-image.png' })
  })

  it('serves every charity from the one prerendered shell', () => {
    expect(answer('/organizacija/patversme-ausma')).toEqual({ kind: 'file', url: '/organizacija/index.html' })
  })

  it('answers the public /admin with a 404 of its own', () => {
    expect(answer('/admin/x')).toMatchObject({ kind: 'response', status: 404 })
  })

  it('looks a percent-encoded address up by its decoded name', () => {
    expect(answer('/par%20mums')).toEqual({ kind: 'file', url: '/par%20mums/index.html' })
  })

  it('answers an address with no file as missing, which the preview serves as 404.html', () => {
    expect(answer('/no-such-page')).toEqual({ kind: 'missing' })
    expect(answer('/missing.png')).toEqual({ kind: 'missing' })
  })

  // decodeURIComponent throws a URIError on these, which reached the preview
  // server as a 500. CloudFront has no such key and answers 404.html.
  it.each(['/x/%E0%A4%A', '/%', '/x/%zz', '/%E0%A4%A.png'])('answers the malformed escape %s as missing, not an error', (target) => {
    expect(() => answer(target)).not.toThrow()
    expect(answer(target)).toEqual({ kind: 'missing' })
  })

  it('never asks about a file for a request the edge answered itself', () => {
    const probe = vi.fn(() => true)
    edgeAnswer(handler, '/par-projektu/', probe)
    expect(probe).not.toHaveBeenCalled()
  })
})

describe('parseQuery: the query string as CloudFront hands it to the function', () => {
  it('is an empty object when there is none', () => {
    expect(parseQuery('')).toEqual({})
    expect(parseQuery('?')).toEqual({})
  })

  it('keeps each value as it was sent, percent-encoding included', () => {
    expect(parseQuery('?q=a%20b&utm_source=x')).toEqual({ q: { value: 'a%20b' }, utm_source: { value: 'x' } })
  })

  it('gives a name with no value an empty one, and splits only at the first =', () => {
    expect(parseQuery('?flag&a=b=c')).toEqual({ flag: { value: '' }, a: { value: 'b=c' } })
  })

  it('collects a repeated name into multiValue, the first value in value', () => {
    expect(parseQuery('?tag=1&x=y&tag=2')).toEqual({
      tag: { value: '1', multiValue: [{ value: '1' }, { value: '2' }] },
      x: { value: 'y' },
    })
  })
})
