import { describe, it, expect, vi } from 'vitest'

import { DEFAULT_LOCALE, LOCALES } from '@/config/site'
import { fallbackPath, localeFromPath, localePath, rootLocale, startupRedirect } from './locale-path'
import { NOT_FOUND_FILE, prerenderPages } from './prerender'
import { alternateLinks } from './seo'

/**
 * `DEFAULT_LOCALE` is the one answer to "which language is the default".
 *
 * `LOCALES` is in the order the language switcher shows, and a Latvian
 * business may well list English first and still want Latvian as its default.
 * So this file moves the default off the first entry and checks that
 * everything that means "the default language" moved with it: `x-default`,
 * the page written as the bare root, the 404 page, and where a URL with no
 * language, or one the site does not publish, is sent.
 */
vi.mock('@/config/site', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/config/site')>()
  const first = original.LOCALES[0]?.code
  const other = original.LOCALES.find((locale) => locale.code !== first)?.code ?? original.DEFAULT_LOCALE
  return { ...original, DEFAULT_LOCALE: other, SITE: { ...original.SITE, defaultLang: other } }
})

const multilingual = LOCALES.length > 1

describe.skipIf(!multilingual)('a default language that is not the first in LOCALES', () => {
  it('is what this file is testing', () => {
    expect(DEFAULT_LOCALE).not.toBe(LOCALES[0]?.code)
  })

  it('is the x-default of every page', () => {
    const defaultLang = LOCALES.find((locale) => locale.code === DEFAULT_LOCALE)?.htmlLang
    for (const route of ['/', '/about', '/legal/privacy']) {
      const links = alternateLinks(route)
      const hrefOf = (lang: string | undefined) => links.find((link) => link.hrefLang === lang)?.href
      expect(hrefOf('x-default'), route).toBe(hrefOf(defaultLang))
    }
  })

  it('is the page written as the bare root', () => {
    const root = prerenderPages().filter((page) => page.files.includes('index.html'))
    expect(root.map((page) => page.key)).toEqual([`${DEFAULT_LOCALE}:/`])
  })

  it('is the language of the 404 page', () => {
    const notFound = prerenderPages().find((page) => page.files.includes(NOT_FOUND_FILE))
    expect(notFound?.locale).toBe(DEFAULT_LOCALE)
  })

  it('is where a URL with no language, or an unpublished one, is sent', () => {
    expect(fallbackPath('/services')).toBe(localePath('/services', DEFAULT_LOCALE))
    expect(fallbackPath('/de/services')).toBe(localePath('/services', DEFAULT_LOCALE))
    expect(rootLocale(undefined)).toBe(DEFAULT_LOCALE)
    expect(rootLocale('de')).toBe(DEFAULT_LOCALE)
    expect(localeFromPath('/de/services')).toBe(DEFAULT_LOCALE)
    expect(startupRedirect('/', undefined)).toBe(localePath('/', DEFAULT_LOCALE))
  })

  it('is one language, whichever of them is asked', () => {
    const xDefault = alternateLinks('/').find((link) => link.hrefLang === 'x-default')?.href ?? ''
    const xDefaultLocale = LOCALES.find((locale) => xDefault.endsWith(localePath('/', locale.code)))?.code
    const rootPage = prerenderPages().find((page) => page.files.includes('index.html'))?.locale
    const notFound = prerenderPages().find((page) => page.files.includes(NOT_FOUND_FILE))?.locale
    const fallback = localeFromPath(fallbackPath('/de/about'))
    expect(new Set([xDefaultLocale, rootPage, notFound, fallback, rootLocale(undefined)])).toEqual(
      new Set([DEFAULT_LOCALE]),
    )
  })
})
