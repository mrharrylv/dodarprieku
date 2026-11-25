import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { createElement, useContext } from 'react'
import { act } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, it, expect, vi } from 'vitest'

import i18n from '@/i18n'
import { HIDDEN_PAGE_TIMEOUT_MS } from '@/config/constants'
import { DEFAULT_LOCALE, LOCALES, LOCALE_CODES, STORAGE_KEYS } from '@/config/site'
import { startupRedirect } from '@/lib/locale-path'
import { PRERENDER_ATTR, REDIRECTING_ATTR, pageKey, startupPlan } from '@/lib/prerender'
import { staticDocument } from '@/test/static-head'
import { ThemeProvider } from './ThemeProvider'
import { ThemeContext, resolveTheme, themePreference, type ResolvedTheme } from './theme-context'

/**
 * `public/theme-init.js`, the decisions a page makes before its first paint:
 * the theme, whether it is in the wrong language to be shown yet, and where
 * the bare root goes.
 *
 * It cannot import anything (it runs before the bundle exists), so it repeats
 * the storage keys, the attribute names, the locale list and the rules that
 * ThemeProvider and i18next apply later. These tests are what keep the copies
 * equal: every case is run through the script AND through the app's own code.
 */
const SOURCE = readFileSync(join(__dirname, '..', '..', 'public', 'theme-init.js'), 'utf8')

type Storage = 'blocked' | Readonly<Record<string, string>>

interface Visit {
  readonly storage?: Storage
  readonly dark?: boolean
  readonly pathname?: string
  readonly search?: string
  readonly hash?: string
  readonly languages?: readonly string[]
  /** `<html lang>` of the document the server sent. */
  readonly lang?: string
  /**
   * Whether `<html>` carries the prerender's marker: true for every file the
   * build writes, false for the dev server's `index.html`.
   */
  readonly prerendered?: boolean
}

/** A timer the script set, run by hand: the tests never wait on a clock. */
interface Timer {
  readonly ms: number
  readonly run: () => void
}

/**
 * The script only ever reaches the page through `window`, so a test hands it
 * a window of its own: storage that throws on access as Safari's does with
 * site data blocked, an OS setting, an address, the browser's languages.
 */
const visit = ({
  storage = {},
  dark = false,
  pathname = '/en',
  search = '',
  hash = '',
  languages = ['en-US', 'en'],
  lang = pathname.split('/').filter(Boolean)[0] ?? DEFAULT_LOCALE,
  prerendered = true,
}: Visit) => {
  document.documentElement.setAttribute('lang', lang)
  if (prerendered) document.documentElement.setAttribute(PRERENDER_ATTR, '')
  else document.documentElement.removeAttribute(PRERENDER_ATTR)
  const replace = vi.fn()
  const timers: Timer[] = []
  const fakeWindow = {
    document,
    get localStorage() {
      if (storage === 'blocked') throw new DOMException('The operation is insecure.', 'SecurityError')
      return { getItem: (key: string) => storage[key] ?? null }
    },
    matchMedia: (query: string) => ({ matches: dark && query.includes('dark'), media: query }),
    location: { pathname, search, hash, replace },
    navigator: { languages, language: languages[0] },
    setTimeout: (run: () => void, ms: number) => timers.push({ ms, run }),
  }
  new Function('window', SOURCE)(fakeWindow)
  return { replace, timers, theme: document.documentElement.getAttribute('data-theme') }
}

const root = document.documentElement

/** The language rules below only exist on a site with more than one language. */
const multilingual = LOCALES.length > 1

/** A published language that is not the default. */
const OTHER = LOCALE_CODES.find((code) => code !== DEFAULT_LOCALE) ?? DEFAULT_LOCALE

afterEach(() => {
  root.removeAttribute('lang')
  root.removeAttribute('data-theme')
  root.removeAttribute(REDIRECTING_ATTR)
  root.removeAttribute(PRERENDER_ATTR)
  root.style.colorScheme = ''
  root.style.visibility = ''
})

describe('theme-init.js: the theme', () => {
  it('reads the key ThemeProvider writes', () => {
    expect(SOURCE).toContain(`'${STORAGE_KEYS.theme}'`)
  })

  it('applies a stored dark choice over a light OS', () => {
    expect(visit({ storage: { [STORAGE_KEYS.theme]: 'dark' }, dark: false }).theme).toBe('dark')
    expect(root.style.colorScheme).toBe('dark')
  })

  it('applies a stored light choice over a dark OS', () => {
    expect(visit({ storage: { [STORAGE_KEYS.theme]: 'light' }, dark: true }).theme).toBe('light')
  })

  it('starts from the OS setting when nothing, or an old "system", is stored', () => {
    expect(visit({ dark: true }).theme).toBe('dark')
    expect(visit({ storage: { [STORAGE_KEYS.theme]: 'system' }, dark: false }).theme).toBe('light')
  })

  // ThemeProvider reads blocked storage as "nothing stored" and follows the
  // OS. Forcing light here made the two disagree on a dark machine, and the
  // provider's correction just after hydration blanked the lazy legal pages.
  it('follows the OS when storage throws, instead of stopping the page', () => {
    expect(() => visit({ storage: 'blocked', dark: true })).not.toThrow()
    expect(root.getAttribute('data-theme')).toBe('dark')
    expect(root.style.colorScheme).toBe('dark')
  })

  it('reads a value it does not recognise as no choice, as ThemeProvider does', () => {
    expect(visit({ storage: { [STORAGE_KEYS.theme]: 'blue' }, dark: true }).theme).toBe('dark')
  })

  const STORED: readonly Storage[] = [
    'blocked',
    {},
    { [STORAGE_KEYS.theme]: 'light' },
    { [STORAGE_KEYS.theme]: 'dark' },
    { [STORAGE_KEYS.theme]: 'system' },
    { [STORAGE_KEYS.theme]: 'blue' },
    { [STORAGE_KEYS.theme]: '' },
    { [STORAGE_KEYS.theme]: 'DARK' },
  ]

  it.each(STORED.flatMap((storage) => [true, false].map((dark) => [storage, dark] as const)))(
    'resolves storage %j with a dark OS %s exactly as ThemeProvider does',
    (storage, dark) => {
      const stored = storage === 'blocked' ? null : (storage[STORAGE_KEYS.theme] ?? null)
      expect(visit({ storage, dark }).theme).toBe(resolveTheme(themePreference(stored), dark))
    },
  )
})

describe('theme-init.js and ThemeProvider, hydrating', () => {
  /** Every value the provider puts in context, by identity. */
  const Recorder = ({ seen }: { seen: ResolvedTheme[] }) => {
    const context = useContext(ThemeContext)
    if (context !== undefined) seen.push(context.resolved)
    return createElement('span', null, 'page')
  }

  const stubOs = (dark: boolean) =>
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: dark && query.includes('dark'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))

  /** Runs the real script against the real window, then hydrates the provider. */
  const hydrateAfterScript = async () => {
    new Function('window', SOURCE)(window)
    const container = document.createElement('div')
    container.innerHTML = renderToString(createElement(ThemeProvider, null, createElement(Recorder, { seen: [] })))
    document.body.appendChild(container)
    const seen: ResolvedTheme[] = []
    await act(async () => {
      hydrateRoot(container, createElement(ThemeProvider, null, createElement(Recorder, { seen })))
    })
    container.remove()
    return seen
  }

  // A context change right after hydration throws away the server markup of
  // every Suspense boundary still waiting for its chunk: the legal pages go
  // blank until their code arrives. The two scripts agreeing is what stops it.
  it.each([
    ['a value it does not recognise', () => window.localStorage.setItem(STORAGE_KEYS.theme, 'blue')],
    [
      'storage that throws',
      () =>
        vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
          throw new DOMException('The operation is insecure.', 'SecurityError')
        }),
    ],
  ])('never changes the context after hydration on a dark OS with %s', async (_, arrange) => {
    stubOs(true)
    arrange()
    const seen = await hydrateAfterScript()
    expect(root.getAttribute('data-theme')).toBe('dark')
    expect(new Set(seen)).toEqual(new Set(['dark']))
  })
})

describe.skipIf(!multilingual)('theme-init.js: the bare root', () => {
  const locale = (code: string) => ({ [STORAGE_KEYS.locale]: code })
  const others = LOCALE_CODES.filter((code) => code !== DEFAULT_LOCALE)

  it('reads the key i18next caches the language under, and marks the page it sends away', () => {
    expect(SOURCE).toContain(`'${STORAGE_KEYS.locale}'`)
    expect(SOURCE).toContain(`'${REDIRECTING_ATTR}'`)
  })

  // A language added in site.ts but not here is never redirected to; one
  // removed there but left here is redirected to a page that no longer exists.
  it('publishes exactly the languages site.ts does, the default first', () => {
    const list = /var LOCALES = \[([^\]]*)\]/.exec(SOURCE)?.[1] ?? ''
    expect(list.split(',').map((code) => code.trim().replace(/'/g, ''))).toEqual([DEFAULT_LOCALE, ...others])
  })

  it.each(others)('sends a visitor who chose %s there before the page paints', (code) => {
    const { replace } = visit({ pathname: '/', storage: locale(code) })
    expect(replace).toHaveBeenCalledWith(`/${code}`)
    expect(root.hasAttribute(REDIRECTING_ATTR)).toBe(true)
    expect(root.style.visibility).toBe('hidden')
  })

  it('leaves the default language to main.tsx, which needs no second request for it', () => {
    const { replace } = visit({ pathname: '/', storage: locale(DEFAULT_LOCALE), languages: ['lv-LV'] })
    expect(replace).not.toHaveBeenCalled()
    expect(root.hasAttribute(REDIRECTING_ATTR)).toBe(false)
    expect(root.style.visibility).toBe('')
  })

  it('uses the browser language when nothing is stored, and when storage throws', () => {
    expect(visit({ pathname: '/', languages: [`${OTHER}-XX`, OTHER] }).replace).toHaveBeenCalledWith(`/${OTHER}`)
    expect(visit({ pathname: '/', storage: 'blocked', languages: [OTHER] }).replace).toHaveBeenCalledWith(`/${OTHER}`)
  })

  it('keeps the query string and the fragment', () => {
    const { replace } = visit({ pathname: '/', search: '?utm_source=x', hash: '#top', storage: locale(OTHER) })
    expect(replace).toHaveBeenCalledWith(`/${OTHER}?utm_source=x#top`)
  })

  it('treats /index.html as the bare root, as startupRedirect does', () => {
    expect(visit({ pathname: '/index.html', storage: locale(OTHER) }).replace).toHaveBeenCalledWith(`/${OTHER}`)
  })

  // A crawler that runs the script and asks for the default language, or for
  // none, stays on the prerendered default-language page.
  it('leaves a crawler on the page it was served', () => {
    expect(visit({ pathname: '/', languages: [DEFAULT_LOCALE] }).replace).not.toHaveBeenCalled()
    expect(visit({ pathname: '/', languages: [] }).replace).not.toHaveBeenCalled()
  })

  it.each(['/en', '/lv/about', '/ru/legal/privacy', '/en/no-such-page'])(
    'never moves a page that names its language: %s',
    (pathname) => {
      expect(visit({ pathname, storage: locale('ru'), languages: ['lv'] }).replace).not.toHaveBeenCalled()
    },
  )

  // What i18next decides for the same visitor is what main.tsx acts on when
  // the script has not moved the page. They must agree, or a visitor the
  // script let through is re-rendered in another language after all.
  const CASES: ReadonlyArray<readonly [string | null, readonly string[]]> = [
    [null, ['en-US', 'en']],
    [null, ['lv-LV', 'lv', 'en-US', 'en']],
    [null, ['ru-RU', 'ru']],
    [null, ['lv']],
    [null, ['de-DE', 'de']],
    [null, ['de-DE', 'lv-LV']],
    [null, ['de', 'ru-RU', 'lv']],
    [null, ['lv_LV']],
    [null, []],
    ['lv', ['en-US']],
    ['ru', ['lv-LV']],
    ['en', ['lv-LV', 'lv']],
    ['de', ['lv-LV', 'en']],
    ['de', ['ru-RU']],
    ['junk', ['lv-LV']],
    ['LV', ['en-US']],
  ]

  it.each(CASES)('agrees with i18next for stored %s and browser languages %j', async (stored, languages) => {
    window.history.replaceState(null, '', '/')
    // The test setup's changeLanguage leaves its choice in storage, which
    // would otherwise stand in for "nothing stored".
    if (stored === null) window.localStorage.removeItem(STORAGE_KEYS.locale)
    else window.localStorage.setItem(STORAGE_KEYS.locale, stored)
    vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue([...languages])
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue(languages[0] ?? '')

    await i18n.changeLanguage()
    const expected = startupRedirect('/', i18n.resolvedLanguage)
    await i18n.changeLanguage(DEFAULT_LOCALE)

    const { replace } = visit({ pathname: '/', storage: stored === null ? {} : locale(stored), languages })
    if (expected === `/${DEFAULT_LOCALE}`) expect(replace).not.toHaveBeenCalled()
    else expect(replace).toHaveBeenCalledWith(expected)
  })
})

describe.skipIf(!multilingual)('theme-init.js: a page served in another language than its address', () => {
  const defaultLang = LOCALES.find((locale) => locale.code === DEFAULT_LOCALE)?.htmlLang ?? DEFAULT_LOCALE
  const others = LOCALE_CODES.filter((code) => code !== DEFAULT_LOCALE)

  // The one 404.html is in the default language. At /lv/nope it used to be
  // painted in English until the bundle loaded and rendered the Latvian one.
  it('keeps /<other language>/nope hidden while it holds the default-language 404 page', () => {
    const { replace } = visit({ pathname: `/${OTHER}/nope`, lang: defaultLang })
    expect(root.style.visibility).toBe('hidden')
    expect(replace).not.toHaveBeenCalled()
    // Not on its way out: main.tsx must still start, render and show it.
    expect(root.hasAttribute(REDIRECTING_ATTR)).toBe(false)
  })

  it.each(others)('does the same for any address in %s', (code) => {
    visit({ pathname: `/${code}/no-such-page`, lang: defaultLang })
    expect(root.style.visibility).toBe('hidden')
  })

  // The comparison is with each language's htmlLang, which need not be its
  // code (ua and uk): comparing with the code would hide every page of such
  // a language until React started.
  it("lists each language's htmlLang, in the same order", () => {
    const list = /var HTML_LANGS = \[([^\]]*)\]/.exec(SOURCE)?.[1] ?? ''
    const byCode = new Map(LOCALES.map((locale) => [locale.code as string, locale.htmlLang as string]))
    expect(list.split(',').map((lang) => lang.trim().replace(/'/g, ''))).toEqual(
      [DEFAULT_LOCALE, ...others].map((code) => byCode.get(code)),
    )
  })

  it.each(LOCALES.map((locale) => [locale.code, locale.htmlLang] as const))(
    'never hides a page in its own language: /%s/about served as lang=%s',
    (code, htmlLang) => {
      visit({ pathname: `/${code}/about`, lang: htmlLang })
      expect(root.style.visibility).toBe('')
    },
  )

  it('compares with htmlLang, not the code, where the two differ', () => {
    const [code] = others
    const regional = SOURCE.replace(/var HTML_LANGS = \[[^\]]*\]/, (list) => list.replace(`'${code}'`, `'${code}-XX'`))
    expect(regional).not.toBe(SOURCE)
    const run = (pathname: string, lang: string) => {
      root.setAttribute('lang', lang)
      root.setAttribute(PRERENDER_ATTR, '')
      root.style.visibility = ''
      new Function('window', regional)({
        document,
        localStorage: { getItem: () => null },
        matchMedia: () => ({ matches: false }),
        location: { pathname, search: '', hash: '', replace: vi.fn() },
        navigator: { languages: [DEFAULT_LOCALE], language: DEFAULT_LOCALE },
        setTimeout: vi.fn(),
      })
      return root.style.visibility
    }
    expect(run(`/${code}/about`, `${code}-XX`)).toBe('')
    expect(run(`/${code}/nope`, defaultLang)).toBe('hidden')
  })

  it('reads the marker the prerender stamps on <html>', () => {
    expect(SOURCE).toContain(`'${PRERENDER_ATTR}'`)
  })

  // The dev server serves index.html, always lang="en" and unmarked, at every
  // address. Hiding it hid every /lv and /ru page until main.tsx ran, and
  // with a compile error main.tsx never runs: Vite's error overlay was
  // hidden with the page, which went blank.
  it.each(others)("never hides the dev server's unmarked document at /%s/about", (code) => {
    const { timers } = visit({ pathname: `/${code}/about`, lang: defaultLang, prerendered: false })
    expect(root.style.visibility).toBe('')
    expect(timers).toEqual([])
  })

  it.each(others)('hides the same address when the document is a prerendered one: /%s/about', (code) => {
    visit({ pathname: `/${code}/about`, lang: defaultLang, prerendered: true })
    expect(root.style.visibility).toBe('hidden')
  })

  it.each([
    ['the default-language 404 page at its own address', `/${DEFAULT_LOCALE}/nope`],
    ['an address with no language, which the edge redirects', '/services'],
    ['a language the site does not publish', '/de/services'],
    ['the bare root', '/'],
  ])('leaves %s visible', (_, pathname) => {
    visit({ pathname, lang: defaultLang, languages: [`${DEFAULT_LOCALE}`] })
    expect(root.style.visibility).toBe('')
  })

  // main.tsx shows the page again only after rendering it itself. Hydrating
  // would keep the markup that is in the wrong language.
  it('hides only a page main.tsx renders from scratch rather than hydrating', () => {
    for (const code of others) {
      const pathname = `/${code}/nope`
      visit({ pathname, lang: defaultLang })
      expect(root.style.visibility, pathname).toBe('hidden')
      const plan = startupPlan({
        pathname,
        resolvedLanguage: code,
        prerendered: pageKey(DEFAULT_LOCALE, null),
        redirecting: root.hasAttribute(REDIRECTING_ATTR),
      })
      expect(plan, pathname).toEqual({ mount: true, address: null, hydrate: false })
      root.style.visibility = ''
    }
  })
})

describe.skipIf(!multilingual)('theme-init.js: a hidden page is never left hidden', () => {
  const defaultLang = LOCALES.find((locale) => locale.code === DEFAULT_LOCALE)?.htmlLang ?? DEFAULT_LOCALE
  const [other = DEFAULT_LOCALE] = LOCALE_CODES.filter((code) => code !== DEFAULT_LOCALE)

  // main.tsx shows the page as soon as it has rendered. A bundle that fails
  // to load, is blocked or throws before that never does, and without this
  // the visitor was left with a blank page.
  it(`shows /${other}/nope after ${HIDDEN_PAGE_TIMEOUT_MS} ms if main.tsx never does`, () => {
    const { timers } = visit({ pathname: `/${other}/nope`, lang: defaultLang })
    expect(root.style.visibility).toBe('hidden')
    expect(timers.map((timer) => timer.ms)).toEqual([HIDDEN_PAGE_TIMEOUT_MS])
    timers.forEach((timer) => timer.run())
    expect(root.style.visibility).toBe('')
  })

  // A navigation that never commits (a 204, the visitor pressed Stop) leaves
  // the bare root hidden, and main.tsx does not start on a page that is on
  // its way out: nothing else would show what the browser parsed of it.
  it('shows the bare root after the same time if the redirect never lands', () => {
    const { replace, timers } = visit({ pathname: '/', storage: { [STORAGE_KEYS.locale]: other } })
    expect(replace).toHaveBeenCalledWith(`/${other}`)
    expect(root.style.visibility).toBe('hidden')
    expect(timers.map((timer) => timer.ms)).toEqual([HIDDEN_PAGE_TIMEOUT_MS])
    timers.forEach((timer) => timer.run())
    expect(root.style.visibility).toBe('')
  })

  it('leaves a page main.tsx has already shown as it is', () => {
    const { timers } = visit({ pathname: `/${other}/nope`, lang: defaultLang })
    root.style.removeProperty('visibility')
    timers.forEach((timer) => timer.run())
    expect(root.style.visibility).toBe('')
  })

  it.each([`/${DEFAULT_LOCALE}/about`, `/${other}/about`, '/'])('sets no timer on a page it does not hide: %s', (pathname) => {
    expect(visit(pathname === '/' ? { pathname, lang: defaultLang, languages: [DEFAULT_LOCALE] } : { pathname }).timers).toEqual([])
  })
})

describe.skipIf(multilingual)('theme-init.js: a single-language site', () => {
  const list = (name: string) =>
    (new RegExp(`var ${name} = \\[([^\\]]*)\\]`).exec(SOURCE)?.[1] ?? '').split(',').map((code) => code.trim().replace(/'/g, ''))

  it('publishes exactly the language site.ts does, with its htmlLang', () => {
    expect(list('LOCALES')).toEqual([...LOCALE_CODES])
    expect(list('HTML_LANGS')).toEqual(LOCALES.map((locale) => locale.htmlLang))
  })

  it.each([
    [{}, ['en-US', 'en']],
    [{ [STORAGE_KEYS.locale]: 'ru' }, ['ru-RU']],
    ['blocked' as const, ['de']],
  ] as const)('never sends the bare root anywhere (storage %j, languages %j)', (storage, languages) => {
    const { replace, timers } = visit({ pathname: '/', storage, languages, lang: DEFAULT_LOCALE })
    expect(replace).not.toHaveBeenCalled()
    expect(timers).toEqual([])
    expect(root.style.visibility).toBe('')
    expect(root.hasAttribute(REDIRECTING_ATTR)).toBe(false)
  })

  it.each(['/par-projektu', '/organizacija/x', `/${DEFAULT_LOCALE}/nope`, '/en/nope'])('never hides %s', (pathname) => {
    const { timers } = visit({ pathname, lang: DEFAULT_LOCALE })
    expect(timers).toEqual([])
    expect(root.style.visibility).toBe('')
  })

  it('agrees with startupRedirect, which leaves the bare root where it is', () => {
    expect(startupRedirect('/', 'en')).toBeNull()
  })
})

describe('index.html', () => {
  const head = staticDocument().head

  // theme-init.js hides a page for its language only on a prerendered
  // document. The dev server serves this file as it is.
  it('carries no prerender marker, so the dev server never hides a page for its language', () => {
    expect(staticDocument().documentElement.hasAttribute(PRERENDER_ATTR)).toBe(false)
  })

  it('loads theme-init.js from the head, synchronously', () => {
    const scripts = [...head.querySelectorAll('script')]
    const init = scripts.find((script) => script.getAttribute('src') === '/theme-init.js')
    expect(init).toBeDefined()
    expect(init?.hasAttribute('async')).toBe(false)
    expect(init?.hasAttribute('defer')).toBe(false)
    expect(init?.getAttribute('type')).toBeNull()
  })

  it('has no inline script, which the production CSP (script-src self) would block', () => {
    const inline = [...staticDocument().querySelectorAll('script')].filter(
      (script) => !script.hasAttribute('src') && script.getAttribute('type') !== 'application/ld+json',
    )
    expect(inline).toEqual([])
  })
})
