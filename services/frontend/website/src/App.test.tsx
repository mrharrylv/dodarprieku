import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { App } from './App'
import { renderWithProviders } from '@/test/render'
import { mountStaticHead } from '@/test/static-head'
import { ROUTES, SITE, charityPath } from '@/config/site'
import { resources } from '@/i18n'

const lv = resources.lv

/** What a page's <title> reads, from the copy itself, not a copy of it. */
const titled = (title: string) => `${title} · ${SITE.name}`

/**
 * Route-level tests.
 *
 * These render the real app at a real URL, which is the only way to catch the
 * failures that matter here: a page that throws on mount, a lazy route that
 * never resolves, a link that points at the wrong path. The site is Latvian
 * only, so no URL carries a language prefix.
 *
 * A style's own markup is tested by the contract, in src/styles/styles.test.tsx.
 */

describe('routing', () => {
  // The map and charity pages fetch the public snapshot; held pending here so
  // each page is checked in its first (loading) state, the prerendered one.
  beforeEach(() => vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => undefined))))

  it('renders the map at the root', async () => {
    renderWithProviders(<App />, { route: ROUTES.home })

    // The map page is a lazy chunk that now carries its floating chrome too;
    // under coverage instrumentation it can take longer than the default second.
    expect(await screen.findByRole('heading', { level: 1, name: lv.map.title }, { timeout: 5000 })).toBeInTheDocument()
  })

  it.each([
    [ROUTES.charity, lv.charity.title],
    [charityPath('patversme-ausma'), lv.charity.title],
    [ROUTES.register, lv.register.title],
    [ROUTES.account, lv.account.title],
    [ROUTES.setPassword, lv.account.setPassword.title],
    [ROUTES.forgotPassword, lv.account.forgotPassword.title],
    [ROUTES.about, lv.about.title],
    [ROUTES.privacy, lv.legal.privacy.title],
  ])('renders %s', async (route, heading) => {
    renderWithProviders(<App />, { route })

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(document.title).toContain(SITE.name)
  })

  it('shows the not-found page for an unknown path', async () => {
    renderWithProviders(<App />, { route: '/no-such-page' })

    expect(await screen.findByRole('heading', { level: 1, name: lv.common.notFound.title })).toBeInTheDocument()
  })

  it('has no admin page on the public site', async () => {
    renderWithProviders(<App />, { route: '/admin' })

    expect(await screen.findByRole('heading', { level: 1, name: lv.common.notFound.title })).toBeInTheDocument()
  })
})

describe('localisation', () => {
  it('renders Latvian and sets <html lang> to it', async () => {
    renderWithProviders(<App />, { route: ROUTES.about })

    await screen.findByRole('heading', { level: 1 })
    expect(screen.getAllByRole('navigation', { name: lv.common.a11y.mainNavigation }).length).toBeGreaterThan(0)
    expect(document.documentElement.lang).toBe('lv')
  })

  it('shows no language switcher, as there is one language', async () => {
    renderWithProviders(<App />, { route: ROUTES.about })
    await screen.findByRole('banner')

    expect(screen.queryByRole('radiogroup', { name: lv.common.language.label })).toBeNull()
  })
})

describe('page chrome', () => {
  it('puts a skip link first in the tab order', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: ROUTES.about })
    await screen.findByRole('banner')

    await user.tab()

    expect(screen.getByRole('link', { name: lv.common.a11y.skipToContent })).toHaveFocus()
  })

  it('exposes the landmarks a screen reader navigates by', async () => {
    renderWithProviders(<App />, { route: ROUTES.about })

    expect(await screen.findByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('shows the map full screen, with no header or footer, and its own register button', async () => {
    renderWithProviders(<App />, { route: ROUTES.home })

    expect(await screen.findByRole('heading', { level: 1, name: lv.map.title })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.queryByRole('banner')).toBeNull()
    expect(screen.queryByRole('contentinfo')).toBeNull()
    const register = screen.getAllByRole('link', { name: lv.common.cta.register })
    expect(register.some((link) => link.getAttribute('href') === ROUTES.register)).toBe(true)
  })

  it.each([ROUTES.about, ROUTES.register, ROUTES.privacy, '/no-such-page'])('keeps the header and footer on %s', async (route) => {
    renderWithProviders(<App />, { route })

    // The registration wizard has a header of its own inside main, so at least one.
    expect((await screen.findAllByRole('banner')).length).toBeGreaterThan(0)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('offers the register button in the header', async () => {
    renderWithProviders(<App />, { route: ROUTES.about })
    const header = await screen.findByRole('banner')

    const register = within(header).getAllByRole('link', { name: lv.common.cta.register })
    expect(register.some((link) => link.getAttribute('href') === ROUTES.register)).toBe(true)
  })

  it.each([ROUTES.home, ROUTES.about])('links to no admin page anywhere on %s', async (route) => {
    const { container } = renderWithProviders(<App />, { route })
    await screen.findByRole('heading', { level: 1 })

    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '')
    expect(hrefs.filter((href) => /admin/i.test(href))).toEqual([])
  })

  it('writes exactly one canonical link', async () => {
    renderWithProviders(<App />, { route: ROUTES.about })
    await screen.findByRole('heading', { level: 1 })

    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
  })

  it('emits hreflang alternates for its language and x-default', async () => {
    renderWithProviders(<App />, { route: ROUTES.about })
    await screen.findByRole('heading', { level: 1 })

    const alternates = document.head.querySelectorAll('link[rel="alternate"][hreflang]')
    const langs = [...alternates].map((el) => el.getAttribute('hreflang'))
    expect(langs.sort()).toEqual(['lv', 'x-default'])
  })

  it('marks the not-found page noindex', async () => {
    renderWithProviders(<App />, { route: '/nope' })
    await screen.findByRole('heading', { level: 1, name: lv.common.notFound.title })

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
    // From a legal page: the map itself no longer links to the project page
    // (its info button opens a panel), the header and footer still do.
    renderWithProviders(<App />, { route: ROUTES.privacy })
    await screen.findByRole('heading', { level: 1 })

    const link = document.querySelector<HTMLAnchorElement>(`a[href="${ROUTES.about}"]`)
    expect(link).not.toBeNull()
    await user.click(link as HTMLAnchorElement)
    await waitFor(() => expect(document.title).toBe(titled(lv.about.meta.title)))

    expect(count('meta[name="description"]')).toBe(1)
    expect(count('meta[property="og:title"]')).toBe(1)
    expect(count('meta[name="robots"]')).toBe(1)
    expect(count('link[rel="canonical"]')).toBe(1)
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
      titled(lv.about.meta.title),
    )
  })

  it('titles the map page with its phrase', async () => {
    renderWithProviders(<App />, { route: ROUTES.home })
    await screen.findByRole('heading', { level: 1 })

    expect(document.title).toBe(titled(lv.map.meta.title))
  })

  it('publishes the Organization once, with no placeholder contact details', async () => {
    renderWithProviders(<App />, { route: ROUTES.about })
    await screen.findByRole('heading', { level: 1 })

    const blocks = [...document.head.querySelectorAll('script[type="application/ld+json"]')].map(
      (script) => script.textContent ?? '',
    )
    expect(blocks.filter((text) => text.includes('"@type":"Organization"'))).toHaveLength(1)
    expect(blocks.join('\n')).not.toMatch(/example\.com|X{3,}|20000000/)
  })
})
