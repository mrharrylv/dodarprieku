import { StrictMode, act } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { render } from '@testing-library/react'
import { MemoryRouter, useNavigate, type NavigateFunction } from 'react-router-dom'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'

import { ScrollRestoration } from './ScrollRestoration'

/**
 * A page load is the browser's to position: it restores the reader's place on
 * reload, and on a slow connection the reader has often scrolled the
 * prerendered page before React arrives. A client navigation is this
 * component's: without it the next page opens wherever the last one was.
 */

let navigate: NavigateFunction = () => undefined

const CaptureNavigate = () => {
  navigate = useNavigate()
  return null
}

const Page = () => (
  <>
    <ScrollRestoration />
    <CaptureNavigate />
    <section id="delivery">Delivery</section>
    <section id="über-uns">Über uns</section>
  </>
)

const tree = (url: string) => (
  <StrictMode>
    <MemoryRouter initialEntries={[url]}>
      <Page />
    </MemoryRouter>
  </StrictMode>
)

const scrollIntoView = vi.fn()

beforeEach(() => {
  window.scrollTo = vi.fn() as typeof window.scrollTo
  // jsdom has no layout, so no scrollIntoView.
  Element.prototype.scrollIntoView = scrollIntoView
})

afterEach(() => {
  scrollIntoView.mockReset()
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
})

const go = (to: string) =>
  act(() => {
    void navigate(to)
  })

describe('ScrollRestoration', () => {
  it('leaves the page where it is when it mounts', () => {
    render(tree('/en/about'))
    expect(window.scrollTo).not.toHaveBeenCalled()
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('leaves the page where the reader scrolled it while hydration was pending', async () => {
    const container = document.createElement('div')
    container.innerHTML = renderToString(tree('/en/about'))
    document.body.appendChild(container)

    await act(async () => {
      hydrateRoot(container, tree('/en/about'))
    })

    expect(window.scrollTo).not.toHaveBeenCalled()
    container.remove()
  })

  it('sends the window to the top on a navigation to another page', () => {
    render(tree('/en/about'))
    go('/en/services')
    expect(window.scrollTo).toHaveBeenCalledTimes(1)
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' })
  })

  // A router link does not scroll to its fragment: the page it names did not
  // exist when the browser last looked for the id.
  it('brings the anchor into view on a navigation to another page with a fragment', () => {
    render(tree('/en'))
    go('/en/services#delivery')
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('delivery'))
    // Instant: a smooth scroll through a page still fading in reads as a blink.
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' })
    expect(window.scrollTo).not.toHaveBeenCalled()
  })

  it('brings an anchor on the same page into view', () => {
    render(tree('/en/services'))
    go('/en/services#delivery')
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('delivery'))
    // Within a page the stylesheet's smooth scroll applies.
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' })
  })

  it('decodes the fragment, as the browser does', () => {
    render(tree('/en'))
    go(`/en/about#${encodeURIComponent('über-uns')}`)
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('über-uns'))
  })

  it.each(['#nothing-here', '#%E0%A4%A'])('falls back to the top for a fragment that names nothing: %s', (hash) => {
    render(tree('/en'))
    go(`/en/services${hash}`)
    expect(scrollIntoView).not.toHaveBeenCalled()
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' })
  })
})
