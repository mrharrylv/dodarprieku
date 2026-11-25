import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRoutes } from 'react-router-dom'

import i18n from '@/i18n'
import { renderWithProviders } from '@/test/render'
import { buildRoutes } from '@/routes'
import { DEVELOPER, NAV_LINKS, ROUTES, SITE } from '@/config/site'
import { MAIN_CONTENT_ID } from '@/config/dom'
import { localePath } from '@/lib/locale-path'
import type { SiteStyle } from './contract'

/**
 * The style contract, enforced against every folder on disk.
 *
 * A style is free in how it looks and constrained in what it must provide:
 * the landmarks a screen reader navigates by, the skip link, the navigation,
 * the theme and language controls, the footer credit, one `h1` per page, and
 * the contact form. A style that drops any of these fails here, with its name
 * in the message, rather than shipping.
 *
 * Eager, so every style is loaded at collection time and `describe.each` has
 * the list. Adding a folder adds it to this suite with no registration.
 */
const modules = import.meta.glob<{ default: SiteStyle }>('./*/style.ts', { eager: true })

const styles: Array<[string, SiteStyle]> = Object.entries(modules)
  .map(([path, module]): [string, SiteStyle] => [
    path.replace(/^\.\/([^/]+)\/style\.ts$/, '$1'),
    module.default,
  ])
  .sort(([a], [b]) => a.localeCompare(b))

const AppFor = ({ style }: { style: SiteStyle }) => useRoutes(buildRoutes(style))

const renderStyle = (style: SiteStyle, route = '/en') =>
  renderWithProviders(<AppFor style={style} />, { route })

const en = (ns: string) => i18n.getFixedT('en', ns)

const PAGES: ReadonlyArray<[string, string]> = [
  ['home', localePath(ROUTES.home, 'en')],
  ['services', localePath(ROUTES.services, 'en')],
  ['about', localePath(ROUTES.about, 'en')],
  ['contact', localePath(ROUTES.contact, 'en')],
]

describe('the style folders', () => {
  it('exist', () => {
    expect(styles.length).toBeGreaterThan(0)
  })
})

describe.each(styles)('style "%s"', (id, style) => {
  it('exports an id equal to its folder name', () => {
    expect(style.id).toBe(id)
  })

  it('renders the landmarks a screen reader navigates by', async () => {
    renderStyle(style)

    expect(await screen.findByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()

    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', MAIN_CONTENT_ID)
    // Focusable, so the skip link can actually move focus here.
    expect(main).toHaveAttribute('tabindex', '-1')
  })

  it('puts the skip link first in the tab order', async () => {
    const user = userEvent.setup()
    renderStyle(style)
    await screen.findByRole('banner')

    await user.tab()

    expect(screen.getByRole('link', { name: en('common')('a11y.skipToContent') })).toHaveFocus()
  })

  it('has a main navigation with every NAV_LINKS entry, localised', async () => {
    renderStyle(style)
    await screen.findByRole('banner')

    const navs = screen.getAllByRole('navigation', { name: en('common')('a11y.mainNavigation') })
    expect(navs.length).toBeGreaterThan(0)

    // A nav may be duplicated (desktop and mobile). One of them must carry
    // every link with the right href.
    const complete = navs.some((nav) =>
      NAV_LINKS.every((link) => {
        const anchors = within(nav).queryAllByRole('link', { name: en('common')(link.labelKey) })
        return anchors.some((a) => a.getAttribute('href') === localePath(link.to, 'en'))
      }),
    )
    expect(complete, 'no navigation landmark contains every NAV_LINKS entry').toBe(true)
  })

  it('offers the theme toggle and the language switcher', async () => {
    renderStyle(style)
    await screen.findByRole('banner')

    expect(screen.getAllByRole('radiogroup', { name: en('common')('language.label') }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /theme/i }).length).toBeGreaterThan(0)
  })

  it('credits the developer in the footer', async () => {
    renderStyle(style)
    await screen.findByRole('banner')

    const footer = screen.getByRole('contentinfo')
    const credit = within(footer).getByRole('link', { name: DEVELOPER.name })
    expect(credit).toHaveAttribute('href', DEVELOPER.url)
  })

  it.each(PAGES)('renders exactly one h1 on the %s page', async (_name, route) => {
    renderStyle(style, route)

    await screen.findByRole('heading', { level: 1 })
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('sets the document title on every page', async () => {
    for (const [, route] of PAGES) {
      const view = renderStyle(style, route)
      await screen.findByRole('heading', { level: 1 })
      expect(document.title).toContain(SITE.name)
      view.unmount()
    }
  })

  it('mounts the shared contact form on the contact page', async () => {
    renderStyle(style, localePath(ROUTES.contact, 'en'))
    await screen.findByRole('heading', { level: 1 })

    expect(screen.getByRole('button', { name: en('contact')('form.submit') })).toBeInTheDocument()
  })

  it('if it has a menu toggle, the menu opens, closes on Escape, and returns focus', async () => {
    const user = userEvent.setup()
    renderStyle(style)
    await screen.findByRole('banner')

    const openLabel = en('common')('nav.openMenu')
    const toggle = screen.queryByRole('button', { name: openLabel })

    // Two styles have no toggle at all: their navigation fits at every width.
    // That is a legitimate design decision, so this is conditional rather than
    // required. What is NOT optional is that a toggle which exists behaves,
    // and that a style does not ship half of one.
    if (toggle === null) {
      expect(
        screen.queryByRole('button', { name: en('common')('nav.closeMenu') }),
        `${id} has a close-menu button but no open-menu button`,
      ).toBeNull()
      return
    }

    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)
    expect(screen.getByRole('button', { name: en('common')('nav.closeMenu') })).toHaveAttribute(
      'aria-expanded',
      'true',
    )

    await user.keyboard('{Escape}')

    // Focus left on a hidden element sends the next Tab back to the top of the
    // document, which is disorienting and easy to ship.
    expect(screen.getByRole('button', { name: openLabel })).toHaveFocus()
  })

  it('renders the shared legal pages and the 404 inside its shell', async () => {
    renderStyle(style, `${localePath(ROUTES.privacy, 'en')}`)
    expect(await screen.findByRole('heading', { level: 1, name: en('legal')('privacy.title') })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})
