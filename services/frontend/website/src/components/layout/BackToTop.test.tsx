import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { BackToTop } from './BackToTop'
import { MAIN_CONTENT_ID } from '@/config/dom'
import { renderWithProviders } from '@/test/render'

const scrollTo = (y: number) => {
  window.scrollY = y
  act(() => {
    window.dispatchEvent(new Event('scroll'))
  })
}

describe('BackToTop', () => {
  beforeEach(() => {
    window.innerHeight = 800
    window.scrollY = 0
    window.scrollTo = vi.fn()
  })

  afterEach(() => {
    window.scrollY = 0
    vi.restoreAllMocks()
  })

  it('is absent until the visitor has scrolled a full viewport', () => {
    renderWithProviders(<BackToTop />)

    // Absent, not invisible: an invisible button is still a tab stop.
    expect(screen.queryByRole('button')).not.toBeInTheDocument()

    scrollTo(801)
    expect(screen.getByRole('button', { name: /lapas augšā/i })).toBeInTheDocument()

    scrollTo(10)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('scrolls to the top and moves focus to the main landmark', async () => {
    const user = userEvent.setup()
    const main = document.createElement('main')
    main.id = MAIN_CONTENT_ID
    main.tabIndex = -1
    document.body.appendChild(main)

    renderWithProviders(<BackToTop />)
    scrollTo(2000)

    await user.click(screen.getByRole('button', { name: /lapas augšā/i }))

    expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }))
    // The next Tab must start at the top, not from a button that just left
    // the screen.
    expect(main).toHaveFocus()
    main.remove()
  })

  it('scrolls instantly when the visitor prefers reduced motion', async () => {
    const user = userEvent.setup()
    const matchMedia = vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query.includes('reduce'),
          media: query,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        }) as unknown as MediaQueryList,
    )

    renderWithProviders(<BackToTop />)
    scrollTo(2000)
    await user.click(screen.getByRole('button', { name: /lapas augšā/i }))

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' })
    matchMedia.mockRestore()
  })
})
