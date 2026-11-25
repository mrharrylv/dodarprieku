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
 * These tests assume the template's default: more than one locale, so URLs
 * carry a `/<lang>` prefix. If a site is cut down to a single language the
 * behaviour flips, and the guard below is what tells you these expectations no
 * longer describe your site.
 */
describe('multi-locale assumption', () => {
  it('the template ships more than one locale', () => {
    expect(LOCALES.length).toBeGreaterThan(1)
    expect(isPrefixed()).toBe(true)
  })
})

describe('isLocaleCode', () => {
  it('accepts configured locales', () => {
    expect(isLocaleCode('en')).toBe(true)
    expect(isLocaleCode('lv')).toBe(true)
  })

  it.each([['de'], [''], ['EN'], [null], [undefined], [42]])('rejects %s', (value) => {
    expect(isLocaleCode(value)).toBe(false)
  })
})

describe('localePath', () => {
  it('prefixes a normal route', () => {
    expect(localePath('/about', 'lv')).toBe('/lv/about')
    expect(localePath('/legal/privacy', 'ru')).toBe('/ru/legal/privacy')
  })

  it('does not leave a trailing slash on the home route', () => {
    expect(localePath('/', 'en')).toBe('/en')
  })
})

describe('stripLocale', () => {
  it('removes a locale prefix', () => {
    expect(stripLocale('/lv/about')).toBe('/about')
    expect(stripLocale('/ru/legal/terms')).toBe('/legal/terms')
  })

  it('turns a bare locale into the home route', () => {
    expect(stripLocale('/en')).toBe('/')
    expect(stripLocale('/en/')).toBe('/')
  })

  it('leaves a path that carries no locale alone', () => {
    expect(stripLocale('/about')).toBe('/about')
  })

  it('does not strip a segment that merely looks similar', () => {
    // "de" is not a configured locale, so this is a page called "de".
    expect(stripLocale('/de/about')).toBe('/de/about')
  })
})

describe('localeFromPath', () => {
  it('reads the locale off the path', () => {
    expect(localeFromPath('/lv/about')).toBe('lv')
    expect(localeFromPath('/ru')).toBe('ru')
  })

  it('falls back to the default when there is no prefix', () => {
    expect(localeFromPath('/about')).toBe(DEFAULT_LOCALE)
    expect(localeFromPath('/')).toBe(DEFAULT_LOCALE)
  })
})

describe('switchLocale', () => {
  it('keeps the visitor on the same page', () => {
    // The whole point: someone reading the terms in English gets the terms in
    // Latvian, not the Latvian home page.
    expect(switchLocale('/en/legal/terms', 'lv')).toBe('/lv/legal/terms')
  })

  it('handles the home page', () => {
    expect(switchLocale('/en', 'ru')).toBe('/ru')
  })

  it('adds a prefix to a path that had none', () => {
    expect(switchLocale('/about', 'lv')).toBe('/lv/about')
  })
})

describe('fallbackPath', () => {
  it('adds the default prefix to an unprefixed path, keeping the page', () => {
    expect(fallbackPath('/services')).toBe(`/${DEFAULT_LOCALE}/services`)
    expect(fallbackPath('/legal/privacy')).toBe(`/${DEFAULT_LOCALE}/legal/privacy`)
  })

  it('replaces an unsupported language, keeping the page', () => {
    // A German speaker asking for /de/services should land on the services
    // page in a language we publish, not on the home page.
    expect(fallbackPath('/de/services')).toBe(`/${DEFAULT_LOCALE}/services`)
    expect(fallbackPath('/pt-BR/about')).toBe(`/${DEFAULT_LOCALE}/about`)
  })

  it('sends the bare root to the default locale home', () => {
    expect(fallbackPath('/')).toBe(`/${DEFAULT_LOCALE}`)
    expect(fallbackPath('')).toBe(`/${DEFAULT_LOCALE}`)
  })

  it('honours an explicit target locale', () => {
    expect(fallbackPath('/services', 'lv')).toBe('/lv/services')
  })

  it('does not mistake a real page for a language tag', () => {
    // "ok" is two letters but there is no page conflict here: it is treated as
    // a language-shaped segment and dropped. Documented rather than accidental
    //, two-letter top-level page names are the one case this heuristic costs,
    // and no route in ROUTES is two letters.
    expect(fallbackPath('/ok')).toBe(`/${DEFAULT_LOCALE}`)
  })
})

describe('rootLocale', () => {
  it('keeps a detected language the site publishes', () => {
    expect(rootLocale('lv')).toBe('lv')
    expect(rootLocale('ru')).toBe('ru')
  })

  it('falls back to the default for anything else', () => {
    expect(rootLocale('de')).toBe(DEFAULT_LOCALE)
    expect(rootLocale(undefined)).toBe(DEFAULT_LOCALE)
    expect(rootLocale('')).toBe(DEFAULT_LOCALE)
  })
})

describe('startupRedirect', () => {
  it('sends the bare root to the detected language home', () => {
    expect(startupRedirect('/', 'ru')).toBe('/ru')
    expect(startupRedirect('/', 'de')).toBe(`/${DEFAULT_LOCALE}`)
    expect(startupRedirect('/', undefined)).toBe(`/${DEFAULT_LOCALE}`)
  })

  it('drops a trailing slash, keeping the page', () => {
    expect(startupRedirect('/lv/about/', 'en')).toBe('/lv/about')
    expect(startupRedirect('/en/', 'lv')).toBe('/en')
    expect(startupRedirect('/en//', 'lv')).toBe('/en')
  })

  it('leaves an address that is already right alone', () => {
    expect(startupRedirect('/en', 'lv')).toBeNull()
    expect(startupRedirect('/lv/about', 'en')).toBeNull()
    expect(startupRedirect('/services', 'en')).toBeNull()
  })

  // The edge serves a page's file at `<page>/index.html` too, with a 200.
  // Rendered at that address, the router finds no route and shows the 404.
  it('treats a page file named in the URL as the page itself', () => {
    expect(startupRedirect('/en/about/index.html', 'lv')).toBe('/en/about')
    expect(startupRedirect('/lv/legal/privacy/index.html', 'en')).toBe('/lv/legal/privacy')
    expect(startupRedirect('/en/index.html', 'lv')).toBe('/en')
  })

  it('treats /index.html as the bare root, so it goes to the visitor language', () => {
    expect(startupRedirect('/index.html', 'ru')).toBe('/ru')
    expect(startupRedirect('/index.html', undefined)).toBe(`/${DEFAULT_LOCALE}`)
  })

  it('leaves a file that merely ends in index.html alone', () => {
    expect(startupRedirect('/en/aboutindex.html', 'en')).toBeNull()
  })

  // `//host/` is a scheme-relative URL: handed to history.replaceState it names
  // another origin, the call throws, and the app never mounts.
  it.each([
    ['//evil.com/', '/evil.com'],
    ['//evil.com', '/evil.com'],
    ['///evil.com//', '/evil.com'],
    ['//en/about/', '/en/about'],
    ['//en/about', '/en/about'],
    ['//index.html', '/lv'],
    ['//', '/lv'],
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
