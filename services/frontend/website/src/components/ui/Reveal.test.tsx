import type { ReactElement } from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'

import { Reveal } from './Reveal'

type Callback = (entries: Array<{ isIntersecting: boolean; target: Element }>) => void

describe('Reveal', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows its content immediately when there is no IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const { getByText } = render(<Reveal>hello</Reveal>)

    // Visible either way: the class only ever animates FROM hidden TO shown.
    expect(getByText('hello')).toHaveClass('animate-rise-in')
  })

  it('animates in once the element intersects, then stops observing', () => {
    let callback: Callback = () => undefined
    const unobserve = vi.fn()
    const disconnect = vi.fn()
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: Callback) {
          callback = cb
        }
        observe() {}
        unobserve = unobserve
        disconnect = disconnect
      },
    )

    const { getByText, unmount } = render(<Reveal delay={0.2}>later</Reveal>)
    const element = getByText('later')
    expect(element).not.toHaveClass('animate-rise-in')

    act(() => callback([{ isIntersecting: false, target: element }]))
    expect(element).not.toHaveClass('animate-rise-in')

    act(() => callback([{ isIntersecting: true, target: element }]))
    expect(element).toHaveClass('animate-rise-in')
    expect(element).toHaveStyle({ animationDelay: '0.2s' })
    expect(unobserve).toHaveBeenCalledWith(element)

    unmount()
    expect(disconnect).toHaveBeenCalled()
  })

  /**
   * A prerendered page is on screen, fully painted, before React starts. An
   * entrance animation starts from opacity 0, so running one on content the
   * reader is already looking at blanks it and fades it back in.
   */
  describe('on a prerendered page', () => {
    let callback: Callback = () => undefined
    const observe = vi.fn()

    const stubObserver = () =>
      vi.stubGlobal(
        'IntersectionObserver',
        class {
          constructor(cb: Callback) {
            callback = cb
          }
          observe = observe
          unobserve() {}
          disconnect() {}
        },
      )

    /** Where the painted element sits, relative to jsdom's 1024x768 window. */
    const at = (top: number, height = 120) => ({ top, bottom: top + height, left: 0, right: 600 })

    const hydrate = async (ui: ReactElement, place: ReturnType<typeof at>) => {
      const container = document.createElement('div')
      container.innerHTML = renderToString(ui)
      document.body.appendChild(container)
      const element = container.firstElementChild as HTMLElement
      element.getBoundingClientRect = () => ({ ...place, x: place.left, y: place.top, width: 600, height: place.bottom - place.top, toJSON: () => place })
      const onRecoverableError = vi.fn()
      await act(async () => {
        hydrateRoot(container, ui, { onRecoverableError })
      })
      expect(onRecoverableError).not.toHaveBeenCalled()
      return element
    }

    afterEach(() => {
      document.body.innerHTML = ''
      observe.mockReset()
      callback = () => undefined
    })

    it.each([
      ['wholly in view', at(100)],
      ['cut by the bottom edge', at(740)],
      ['cut by the top edge, the reader having scrolled past', at(-100)],
    ])('leaves content that is %s as it was painted', async (_, place) => {
      stubObserver()
      const element = await hydrate(<Reveal delay={0.2}>headline</Reveal>, place)

      // What an observer reports for an element on screen, straight away.
      act(() => callback([{ isIntersecting: true, target: element }]))

      expect(element).not.toHaveClass('animate-rise-in')
      expect(element.style.animationDelay).toBe('')
      // Not even watched: scrolling it out and back in replays nothing.
      expect(observe).not.toHaveBeenCalled()
    })

    it('still brings in content that enters the viewport later', async () => {
      stubObserver()
      const element = await hydrate(<Reveal delay={0.2}>further down</Reveal>, at(1400))
      expect(observe).toHaveBeenCalledWith(element)
      expect(element).not.toHaveClass('animate-rise-in')

      act(() => callback([{ isIntersecting: true, target: element }]))
      expect(element).toHaveClass('animate-rise-in')
      expect(element).toHaveStyle({ animationDelay: '0.2s' })
    })

    it('leaves it alone when there is no IntersectionObserver', async () => {
      vi.stubGlobal('IntersectionObserver', undefined)
      const element = await hydrate(<Reveal>headline</Reveal>, at(1400))
      expect(element).not.toHaveClass('animate-rise-in')
    })
  })
})
