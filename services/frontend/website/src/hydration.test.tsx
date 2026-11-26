import { StrictMode, act } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { afterEach, beforeAll, describe, it, expect, vi } from 'vitest'

import i18n, { resources } from '@/i18n'
import { App } from '@/App'
import { ROUTES, SITE } from '@/config/site'
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
    <BrowserRouter>
      <App />
    </BrowserRouter>
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

  it('keeps working after hydration: the navigation still navigates', async () => {
    const { consoleError } = await hydrate('/legal/privacy', 'lv:/legal/privacy')

    const about = container?.querySelector<HTMLAnchorElement>(`a[href="${ROUTES.about}"]`)
    expect(about).toBeTruthy()
    await act(async () => about?.click())
    await settle()

    // "Par projektu" is the map with its info panel open; the address settles on the map's own.
    await vi.waitFor(() => expect(window.location.pathname).toBe(ROUTES.home))
    await vi.waitFor(() => expect(container?.querySelector('h2')?.textContent).toBe(resources.lv.map.info.title), { timeout: 5000 })
    expect(document.documentElement.lang).toBe('lv')
    await vi.waitFor(() => expect(document.title).toBe(`${resources.lv.map.meta.title} · ${SITE.name}`))
    expect(consoleError).not.toHaveBeenCalled()
  })
})
