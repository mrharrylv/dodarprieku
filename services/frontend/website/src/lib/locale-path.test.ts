import { describe, it, expect } from 'vitest'

import { DEFAULT_LOCALE, LOCALES } from '@/config/site'
import {
  fallbackPath,
  isLocaleCode,
  isPrefixed,
  localeFromPath,
  localePath,
  rootLocale,
  startupRedirect,
  stripLocale,
  switchLocale,
} from './locale-path'

/**
 * Dodar prieku is Latvian only, so no URL carries a `/<lang>` prefix:
 * `/par-projektu` is the page, never `/lv/par-projektu`. The guard below is
 * what tells you these expectations no longer describe the site if a second
 * language is ever added.
 */
describe('single-locale assumption', () => {
  it('the site ships exactly one locale, so URLs are unprefixed', () => {
    expect(LOCALES).toHaveLength(1)
    expect(DEFAULT_LOCALE).toBe('lv')
    expect(isPrefixed()).toBe(false)
  })
})

describe('isLocaleCode', () => {
  it('accepts the configured locale', () => {
    expect(isLocaleCode('lv')).toBe(true)
  })

  it.each([['en'], ['ru'], ['de'], [''], ['LV'], [null], [undefined], [42]])('rejects %s', (value) => {
    expect(isLocaleCode(value)).toBe(false)
  })
})

describe('localePath', () => {
  it('returns a route unchanged', () => {
    expect(localePath('/par-projektu', 'lv')).toBe('/par-projektu')
    expect(localePath('/legal/privacy', 'lv')).toBe('/legal/privacy')
    expect(localePath('/', 'lv')).toBe('/')
  })
})

describe('stripLocale', () => {
  it('leaves every path as it is, since none carries a prefix', () => {
    expect(stripLocale('/par-projektu')).toBe('/par-projektu')
    expect(stripLocale('/lv/about')).toBe('/lv/about')
  })

  it('reads an empty path as the home route', () => {
    expect(stripLocale('')).toBe('/')
  })
})

describe('localeFromPath', () => {
  it('is always the default', () => {
    expect(localeFromPath('/par-projektu')).toBe(DEFAULT_LOCALE)
    expect(localeFromPath('/ru/x')).toBe(DEFAULT_LOCALE)
    expect(localeFromPath('/')).toBe(DEFAULT_LOCALE)
  })
})

describe('switchLocale', () => {
  it('keeps the visitor on the same page', () => {
    expect(switchLocale('/legal/terms', 'lv')).toBe('/legal/terms')
  })
})

describe('fallbackPath', () => {
  it('keeps an unprefixed path as the page', () => {
    expect(fallbackPath('/par-projektu')).toBe('/par-projektu')
    expect(fallbackPath('/legal/privacy')).toBe('/legal/privacy')
  })

  it('drops a segment shaped like a language tag, keeping the page', () => {
    expect(fallbackPath('/de/par-projektu')).toBe('/par-projektu')
    expect(fallbackPath('/pt-BR/konts')).toBe('/konts')
  })

  it('sends the bare root, or only a language, to the home page', () => {
    expect(fallbackPath('/')).toBe('/')
    expect(fallbackPath('')).toBe('/')
    expect(fallbackPath('/ok')).toBe('/')
  })
})

describe('rootLocale', () => {
  it('keeps the published language and falls back to it for anything else', () => {
    expect(rootLocale('lv')).toBe('lv')
    expect(rootLocale('en')).toBe(DEFAULT_LOCALE)
    expect(rootLocale(undefined)).toBe(DEFAULT_LOCALE)
    expect(rootLocale('')).toBe(DEFAULT_LOCALE)
  })
})

describe('startupRedirect', () => {
  it('leaves the bare root where it is, whatever language was detected', () => {
    expect(startupRedirect('/', 'en')).toBeNull()
    expect(startupRedirect('/', undefined)).toBeNull()
  })

  it('drops a trailing slash, keeping the page', () => {
    expect(startupRedirect('/par-projektu/', 'lv')).toBe('/par-projektu')
    expect(startupRedirect('/konts//', 'lv')).toBe('/konts')
  })

  it('leaves an address that is already right alone', () => {
    expect(startupRedirect('/par-projektu', 'lv')).toBeNull()
    expect(startupRedirect('/organizacija/patversme', 'lv')).toBeNull()
  })

  // The edge serves a page's file at `<page>/index.html` too, with a 200.
  // Rendered at that address, the router finds no route and shows the 404.
  it('treats a page file named in the URL as the page itself', () => {
    expect(startupRedirect('/par-projektu/index.html', 'lv')).toBe('/par-projektu')
    expect(startupRedirect('/legal/privacy/index.html', 'lv')).toBe('/legal/privacy')
    expect(startupRedirect('/index.html', 'lv')).toBe('/')
  })

  it('leaves a file that merely ends in index.html alone', () => {
    expect(startupRedirect('/aboutindex.html', 'lv')).toBeNull()
  })

  // `//host/` is a scheme-relative URL: handed to history.replaceState it names
  // another origin, the call throws, and the app never mounts.
  it.each([
    ['//evil.com/', '/evil.com'],
    ['//evil.com', '/evil.com'],
    ['///evil.com//', '/evil.com'],
    ['//par-projektu/', '/par-projektu'],
    ['//index.html', '/'],
    ['//', '/'],
  ])('collapses the leading slashes of %s, giving %s', (pathname, expected) => {
    expect(startupRedirect(pathname, 'lv')).toBe(expected)
  })

  it.each(['//evil.com/', '//evil.com', '///evil.com/x/', '//', '//index.html', '/\\evil.com/', 'evil.com'])(
    'never names another origin, whatever the path: %s',
    (pathname) => {
      const target = startupRedirect(pathname, 'lv') ?? pathname
      const origin = 'https://site.example'
      expect(new URL(target, `${origin}${pathname.startsWith('/') ? '' : '/'}`).origin).toBe(origin)
      expect(target.startsWith('//')).toBe(false)
    },
  )
})
