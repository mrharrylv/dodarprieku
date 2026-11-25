import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { App } from './App'
import { renderWithProviders } from '@/test/render'
import { mountStaticHead } from '@/test/static-head'
import { DEFAULT_LOCALE, SITE } from '@/config/site'
import { resources } from '@/i18n'

/** What a page's <title> reads, from the copy itself, not a copy of it. */
const titleOf = (lang: keyof typeof resources, ns: 'services' | 'about' | 'contact') =>
  `${resources[lang][ns].meta.title} · ${SITE.name}`

/**
 * Route-level tests.
 *
 * These render the real app at a real URL, which is the only way to catch the
 * failures that matter here: a page that throws on mount, a locale prefix that
 * does not reach i18next, a link that points at an unprefixed path.
 *
 * They render whichever STYLE is active, so everything asserted here has to be
 * true of all ten. That rules out asserting a heading's text: `long-scroll` is
 * one document, and /services, /about and /contact all render it, so its h1 is
 * the hero's on every route. What identifies a page across every style is the
 * meta it declares, so these assert the document title, which each page sets
 * from its own `meta.title`.
 *
 * A style's own markup is tested by the contract, in src/styles/styles.test.tsx.
 */

describe('routing', () => {
  it('renders the home page at a locale root', async () => {
    renderWithProviders(<App />, { route: '/en' })

    expect(
      await screen.findByRole('heading', { level: 1, name: resources.en.home.hero.title }),
    ).toBeInTheDocument()
  })

  it.each([
    ['/en/services', titleOf('en', 'services')],
    ['/en/about', titleOf('en', 'about')],
    ['/en/contact', titleOf('en', 'contact')],
  ])('renders %s', async (route, title) => {
    renderWithProviders(<App />, { route })

    await screen.findByRole('heading', { level: 1 })
    expect(document.title).toBe(title)
  })

  it('renders the lazy-loaded legal pages', async () => {
    renderWithProviders(<App />, { route: '/en/legal/privacy' })

    expect(
      await screen.findByRole('heading', { level: 1, name: /privacy policy/i }),
    ).toBeInTheDocument()
  })

  it('shows the not-found page for an unknown path', async () => {
    renderWithProviders(<App />, { route: '/en/no-such-page' })

    expect(
      await screen.findByRole('heading', { level: 1, name: /page not found/i }),
    ).toBeInTheDocument()
  })

  it('redirects an unprefixed path to the default locale, keeping the page', async () => {
    renderWithProviders(<App />, { route: '/services' })

    // The visitor asked for the services page. They must get the services page,
    // not the home page.
    await screen.findByRole('heading', { level: 1 })
    expect(document.title).toBe(titleOf(DEFAULT_LOCALE, 'services'))
  })

  it('redirects an unsupported language to the default, keeping the page', async () => {
    renderWithProviders(<App />, { route: '/de/about' })

    await screen.findByRole('heading', { level: 1 })
    expect(document.title).toBe(titleOf(DEFAULT_LOCALE, 'about'))
  })

  it('sends the bare root to a locale home page', async () => {
    renderWithProviders(<App />, { route: '/' })

    // Which language depends on the browser's, so either home page will do.
    const heading = await screen.findByRole('heading', { level: 1 })
    expect([resources.lv.home.hero.title, resources.en.home.hero.title, resources.ru.home.hero.title]).toContain(
      heading.textContent,
    )
  })
})

describe('localisation', () => {
  it('renders Latvian at a Latvian URL', async () => {
    renderWithProviders(<App />, { route: '/lv' })

    // The URL is the authority. Whatever is stored as a preference, /lv is
    // Latvian, otherwise a shared link contradicts the page it opens, and
    // that URL is what search engines index.
    expect(
      await screen.findByRole('heading', { level: 1, name: resources.lv.home.hero.title }),
    ).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Galvenā navigācija' })).toBeInTheDocument()
  })

  it('sets <html lang> to match the URL', async () => {
    renderWithProviders(<App />, { route: '/ru' })

    // Left at "en", a Russian page is read aloud by an English speech
    // synthesiser and is close to unintelligible.
    await screen.findByRole('banner')
    expect(document.documentElement.lang).toBe('ru')
  })

  it('keeps the current page when the language is switched', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/en/about' })

    await screen.findByRole('heading', { level: 1 })
    expect(document.title).toBe(titleOf('en', 'about'))

    const switcher = screen.getAllByRole('radiogroup', { name: /language/i })[0]
    expect(switcher).toBeDefined()

    await user.click(within(switcher as HTMLElement).getByRole('radio', { name: /latvie/i }))

    // Still the about page, in Latvian. A switcher that returns you to the
    // home page loses your place, which is the usual bug here.
    await waitFor(() => expect(document.documentElement.lang).toBe('lv'))
    await waitFor(() => expect(document.title).toBe(titleOf('lv', 'about')))
  })
})

describe('page chrome', () => {
  it('puts a skip link first in the tab order', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/en' })
    await screen.findByRole('banner')

    await user.tab()

    expect(screen.getByRole('link', { name: /skip to main content/i })).toHaveFocus()
  })

  it('exposes the landmarks a screen reader navigates by', async () => {
    renderWithProviders(<App />, { route: '/en' })

    expect(await screen.findByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('has exactly one h1 per page', async () => {
    renderWithProviders(<App />, { route: '/en/services' })
    await screen.findByRole('heading', { level: 1 })

    // More than one h1 makes the document outline useless.
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('sets the document title from the page', async () => {
    renderWithProviders(<App />, { route: '/en/contact' })
    await screen.findByRole('heading', { level: 1 })

    expect(document.title).toContain(SITE.name)
  })

  it('writes exactly one canonical link', async () => {
    renderWithProviders(<App />, { route: '/en/about' })
    await screen.findByRole('heading', { level: 1 })

    // Accumulating canonicals across navigations lets a crawler pick whichever
    // it likes, which is how the wrong URL ends up indexed.
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
  })

  it('emits hreflang alternates for every language', async () => {
    renderWithProviders(<App />, { route: '/en/about' })
    await screen.findByRole('heading', { level: 1 })

    const alternates = document.head.querySelectorAll('link[rel="alternate"][hreflang]')
    const langs = [...alternates].map((el) => el.getAttribute('hreflang'))

    expect(langs).toContain('en')
    expect(langs).toContain('lv')
    expect(langs).toContain('ru')
    expect(langs).toContain('x-default')
  })

  it('marks the not-found page noindex', async () => {
    renderWithProviders(<App />, { route: '/en/nope' })
    await screen.findByRole('heading', { level: 1, name: /page not found/i })

    // The edge sends a 404 status for a missing page, but a not-found page
    // reached by client-side navigation has no status code: this is what says
    // it to a crawler that renders.
    const robots = document.head.querySelector('meta[name="robots"]')
    expect(robots?.getAttribute('content')).toContain('noindex')
  })
})

describe('the document head', () => {
  // The head as index.html ships it, before React mounts: the static SEO tags
  // the runtime has to replace rather than duplicate.
  let unmountStatic: () => void = () => undefined
  beforeEach(() => {
    unmountStatic = mountStaticHead()
  })
  afterEach(() => unmountStatic())

  const count = (selector: string) => document.head.querySelectorAll(selector).length

  it('holds exactly one description and one og:title after navigating', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/en' })
    await screen.findByRole('heading', { level: 1 })

    // Every style's header links to the services route.
    const link = document.querySelector<HTMLAnchorElement>('a[href="/en/services"]')
    expect(link).not.toBeNull()
    await user.click(link as HTMLAnchorElement)
    await waitFor(() => expect(document.title).toBe(titleOf('en', 'services')))

    expect(count('meta[name="description"]')).toBe(1)
    expect(count('meta[property="og:title"]')).toBe(1)
    expect(count('meta[name="robots"]')).toBe(1)
    expect(count('link[rel="canonical"]')).toBe(1)
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
      titleOf('en', 'services'),
    )
  })

  it('titles the home page with its phrase, never "Home · <brand>"', async () => {
    renderWithProviders(<App />, { route: '/en' })
    await screen.findByRole('heading', { level: 1 })

    expect(document.title).toBe(`${resources.en.home.meta.title} · ${SITE.name}`)
    expect(document.title).not.toMatch(/^Home ·/)
  })

  it('publishes the Organization once, with no placeholder contact details', async () => {
    renderWithProviders(<App />, { route: '/en/about' })
    await screen.findByRole('heading', { level: 1 })

    const blocks = [...document.head.querySelectorAll('script[type="application/ld+json"]')].map(
      (script) => script.textContent ?? '',
    )
    expect(blocks.filter((text) => text.includes('"@type":"Organization"'))).toHaveLength(1)
    expect(blocks.join('\n')).not.toMatch(/example\.com|X{3,}|20000000/)
  })
})

/*
 * The mobile menu is NOT tested here.
 *
 * This file renders whichever style is active, so anything it asserts has to
 * be true of all ten. Eight have a menu toggle and two (editorial, minimal)
 * deliberately do not: their navigation fits at every width. An assertion
 * about a hamburger belongs with the style contract, where it can be
 * conditional, and it lives in `src/styles/styles.test.tsx`.
 */
