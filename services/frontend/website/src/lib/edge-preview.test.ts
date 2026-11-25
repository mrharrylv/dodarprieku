import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, it, expect, vi } from 'vitest'

import { DEFAULT_LOCALE } from '@/config/site'
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
const BUILT = new Set(['/index.html', '/en/index.html', '/en/about/index.html', '/lv/about/index.html', '/og-image.png', '/lv/par mums/index.html'])
const hasFile = (path: string) => BUILT.has(path)

const answer = (target: string) => edgeAnswer(handler, target, hasFile)

/** The function's Cache-Control on every 301: an hour, not for ever. */
const REDIRECT_CACHE = 'public, max-age=3600'

describe('edgeAnswer: the edge function decides', () => {
  it.each([
    ['/services', `/${DEFAULT_LOCALE}/services`],
    ['/about', `/${DEFAULT_LOCALE}/about`],
    ['/de/services', `/${DEFAULT_LOCALE}/services`],
    ['/en/about/index.html', '/en/about'],
    ['//en//about', '/en/about'],
    ['/en/about/', '/en/about'],
    ['/index.html', '/'],
  ])('answers %s with a 301 to %s, as CloudFront does', (target, location) => {
    expect(answer(target)).toEqual({ kind: 'response', status: 301, headers: { location, 'cache-control': REDIRECT_CACHE } })
  })

  // The plugin sends every header the function answered with, so the
  // preview's 301 carries the same bounded Cache-Control as production's.
  it("passes the function's Cache-Control on with its 301", () => {
    expect(answer('/services')).toMatchObject({ headers: { 'cache-control': REDIRECT_CACHE } })
  })

  it('keeps the query string on a redirect, as the viewer sent it', () => {
    expect(answer('/services?utm_source=x&q=a%20b&tag=1&tag=2&flag')).toEqual({
      kind: 'response',
      status: 301,
      headers: {
        location: `/${DEFAULT_LOCALE}/services?utm_source=x&q=a%20b&tag=1&tag=2&flag`,
        'cache-control': REDIRECT_CACHE,
      },
    })
  })

  it('reads the raw path, not one a URL parser has already tidied', () => {
    // new URL('//en//about', base) takes "en" for a host name.
    expect(answer('//en//about?x=1')).toMatchObject({ headers: { location: '/en/about?x=1' } })
  })

  it("serves a page's file, with the query string", () => {
    expect(answer('/en/about')).toEqual({ kind: 'file', url: '/en/about/index.html' })
    expect(answer('/lv/about?utm_source=x')).toEqual({ kind: 'file', url: '/lv/about/index.html?utm_source=x' })
    expect(answer('/')).toEqual({ kind: 'file', url: '/index.html' })
    expect(answer('/og-image.png')).toEqual({ kind: 'file', url: '/og-image.png' })
  })

  it('looks a percent-encoded address up by its decoded name', () => {
    expect(answer('/lv/par%20mums')).toEqual({ kind: 'file', url: '/lv/par%20mums/index.html' })
  })

  it('answers an address with no file as missing, which the preview serves as 404.html', () => {
    expect(answer('/en/no-such-page')).toEqual({ kind: 'missing' })
    expect(answer('/missing.png')).toEqual({ kind: 'missing' })
  })

  // decodeURIComponent throws a URIError on these, which reached the preview
  // server as a 500. CloudFront has no such key and answers 404.html.
  it.each(['/en/%E0%A4%A', '/en/%', '/lv/%zz', '/%E0%A4%A.png'])('answers the malformed escape %s as missing, not an error', (target) => {
    expect(() => answer(target)).not.toThrow()
    expect(answer(target)).toEqual({ kind: 'missing' })
  })

  it('sends an unprefixed malformed escape to the default language first, as the edge does', () => {
    expect(answer('/%E0%A4%A')).toEqual({
      kind: 'response',
      status: 301,
      headers: { location: `/${DEFAULT_LOCALE}/%E0%A4%A`, 'cache-control': REDIRECT_CACHE },
    })
  })

  it('never asks about a file for a request the edge answered itself', () => {
    const probe = vi.fn(() => true)
    edgeAnswer(handler, '/services', probe)
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
