import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'

import { ScrollProgress } from './ScrollProgress'

/**
 * jsdom lays nothing out, so a scrollable document has to be described rather
 * than produced. These write the two numbers the component reads and restore
 * them afterwards, because a leaked window height breaks whatever test runs
 * next.
 */
const setPageHeight = (scrollHeight: number) => {
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: scrollHeight,
  })
}

const scrollTo = (y: number) => {
  window.scrollY = y
  act(() => {
    window.dispatchEvent(new Event('scroll'))
  })
}

describe('ScrollProgress', () => {
  beforeEach(() => {
    window.innerHeight = 800
    window.scrollY = 0
  })

  afterEach(() => {
    Reflect.deleteProperty(document.documentElement, 'scrollHeight')
    window.scrollY = 0
  })

  it('renders nothing when the page does not scroll', () => {
    setPageHeight(800)
    const { container } = render(<ScrollProgress />)

    // A bar pinned at zero on every short page is decoration that reports a
    // measurement it does not have.
    expect(container).toBeEmptyDOMElement()
  })

  it('reports how far down a scrollable page the visitor is', () => {
    setPageHeight(2800)
    const { container } = render(<ScrollProgress />)

    const fill = container.querySelector('[aria-hidden="true"] > div')
    expect(fill).toHaveStyle({ transform: 'scaleX(0)' })

    scrollTo(1000)
    expect(fill).toHaveStyle({ transform: 'scaleX(0.5)' })
  })

  it('clamps past the ends rather than overshooting', () => {
    setPageHeight(2800)
    const { container } = render(<ScrollProgress />)
    const fill = container.querySelector('[aria-hidden="true"] > div')

    // Both happen for real: rubber-band scrolling on iOS overshoots at the top,
    // and a shrinking document overshoots at the bottom.
    scrollTo(-120)
    expect(fill).toHaveStyle({ transform: 'scaleX(0)' })

    scrollTo(9000)
    expect(fill).toHaveStyle({ transform: 'scaleX(1)' })
  })

  it('stops reporting when the page stops being scrollable', () => {
    setPageHeight(2800)
    const { container } = render(<ScrollProgress />)
    expect(container).not.toBeEmptyDOMElement()

    setPageHeight(600)
    scrollTo(0)
    expect(container).toBeEmptyDOMElement()
  })

  it('is hidden from screen readers', () => {
    setPageHeight(2800)
    render(<ScrollProgress />)

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })
})
