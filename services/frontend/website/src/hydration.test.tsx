import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { StrictMode, act } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { afterEach, beforeAll, describe, it, expect, vi } from 'vitest'

import i18n, { resources } from '@/i18n'
import { App } from '@/App'
import { ThemeProvider } from '@/context/ThemeProvider'
import { ROUTES, SITE, STORAGE_KEYS } from '@/config/site'
import { startupPlan, type RenderedPage } from '@/lib/prerender'
import { prerenderInChild } from '@/test/prerender-in-child'

/**
 * The browser's side of the prerender: every sampled page hydrates.
 *
 * A page whose server markup the browser cannot reuse still works: React logs
 * an error, throws the markup away and renders it again. Every visitor then
 * pays for the page twice, and the error is easy to never see. So the markup
 * is built the way the build builds it (`prerenderInChild`) and hydrated the
 * way `main.tsx` hydrates it, and any recoverable error or console error
 * fails the test.
 *
 * `make verify-styles` runs this file against every style.
 */

/**
 * main.tsx's tree, provider for provider. If this and main.tsx drift apart,
 * the test proves nothing about the real page: change both in the same commit.
 */
const clientTree = (
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
)

const SAMPLE = [
  ['lv:/', '/'],
  ['lv:/par-projektu', '/par-projektu'],
  ['lv:/organizacija', '/organizacija'],
  ['lv:/registreties', '/registreties/'],
  ['lv:/konts', '/konts'],
  ['lv:/konts/parole', '/konts/parole'],
  ['lv:/konts/aizmirsu', '/konts/aizmirsu'],
  ['lv:/legal/privacy', '/legal/privacy'],
  ['lv:/legal/company', '/legal/company'],
  ['lv:404', '/no-such-page'],
  // The edge answers these spellings with the page's own file.
  ['lv:/', '/index.html'],
  ['lv:/par-projektu', '/par-projektu/index.html'],
] as const

/** The pre-paint script, run in the page's window before React starts. */
const THEME_INIT = readFileSync(join(__dirname, '..', 'public', 'theme-init.js'), 'utf8')

let markup: Readonly<Record<string, RenderedPage>> = {}

beforeAll(() => {
  markup = prerenderInChild([...new Set([...SAMPLE.map(([key]) => key), 'lv:/legal/cookies', 'lv:/legal/terms'])])
}, 120_000)

const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 50)))

describe('hydrating the prerendered markup', () => {
  let root: Root | null = null
  let container: HTMLElement | null = null

  afterEach(() => {
    act(() => root?.unmount())
    container?.remove()
    root = null
    container = null
    window.history.replaceState(null, '', '/')
  })

  const hydrate = async (url: string, key: string) => {
    const rendered = markup[key]
    expect(rendered, `no markup for ${key}`).toBeDefined()

    // What the language detector does on a real page load: the URL decides.
    await i18n.changeLanguage(key.slice(0, 2))
    // What main.tsx does before React starts.
    const plan = startupPlan({ pathname: url, resolvedLanguage: i18n.resolvedLanguage, prerendered: key, redirecting: false })
    expect(plan).toMatchObject({ mount: true, hydrate: true })
    window.history.replaceState(null, '', plan.mount ? (plan.address ?? url) : url)

    container = document.createElement('div')
    container.innerHTML = rendered?.body ?? ''
    document.body.appendChild(container)
    const heading = container.querySelector('h1')

    const onRecoverableError = vi.fn()
    const consoleError = vi.spyOn(console, 'error')
    await act(async () => {
      root = hydrateRoot(container as HTMLElement, clientTree, { onRecoverableError })
    })
    await settle()

    return { heading, onRecoverableError, consoleError }
  }

  it.each(SAMPLE)('%s hydrates at %s, reusing the server markup', async (key, url) => {
    const { heading, onRecoverableError, consoleError } = await hydrate(url, key)

    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(consoleError).not.toHaveBeenCalled()
    // A mismatch makes React throw the server markup away and render afresh,
    // which would put a different <h1> node in the document.
    expect(heading).not.toBeNull()
    expect(container?.querySelector('h1')).toBe(heading)
  })

  it('hydrates for a visitor who chose dark, then shows their choice', async () => {
    window.localStorage.setItem(STORAGE_KEYS.theme, 'dark')
    document.documentElement.setAttribute('data-theme', 'dark')

    const { onRecoverableError, consoleError } = await hydrate('/par-projektu', 'lv:/par-projektu')

    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(consoleError).not.toHaveBeenCalled()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    document.documentElement.removeAttribute('data-theme')
  })

  // theme-init.js used to force light when it could not use the stored value,
  // and ThemeProvider corrected it to the OS's dark just after hydration. That
  // context change reached the legal page's Suspense boundary while its chunk
  // was still loading, and React threw the server markup away.
  // Each case hydrates a page whose chunk no earlier test has loaded, so its
  // Suspense boundary is still waiting when the provider's first effect runs.
  it.each([
    [
      'a stored theme this site never wrote',
      '/legal/cookies',
      () => window.localStorage.setItem(STORAGE_KEYS.theme, 'blue'),
    ],
    [
      // Reads only: i18next writes the language on every change, and in a real
      // browser with storage blocked it has already stopped trying.
      'storage that throws when read',
      '/legal/terms',
      () =>
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
          throw new DOMException('The operation is insecure.', 'SecurityError')
        }),
    ],
  ])('keeps a lazy legal page for a dark-OS visitor with %s', async (_, url, arrange) => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('dark'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    arrange()
    new Function('window', THEME_INIT)(window)

    const { heading, onRecoverableError, consoleError } = await hydrate(url, `lv:${url}`)

    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(consoleError).not.toHaveBeenCalled()
    expect(container?.querySelector('h1')).toBe(heading)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    document.documentElement.removeAttribute('data-theme')
  })

  it('keeps working after hydration: the navigation still navigates', async () => {
    const { consoleError } = await hydrate('/legal/privacy', 'lv:/legal/privacy')

    const about = container?.querySelector<HTMLAnchorElement>(`a[href="${ROUTES.about}"]`)
    expect(about).toBeTruthy()
    await act(async () => about?.click())
    await settle()

    expect(window.location.pathname).toBe(ROUTES.about)
    expect(document.documentElement.lang).toBe('lv')
    await vi.waitFor(() => expect(document.title).toBe(`${resources.lv.about.meta.title} · ${SITE.name}`))
    expect(consoleError).not.toHaveBeenCalled()
  })
})
