import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithProviders } from '@/test/render'

import { Lightbox, wrapIndex } from './Lightbox'

const PHOTOS = [
  { src: 'https://example.com/1.jpg', alt: 'Tank, photo 1 of 3' },
  { src: 'https://example.com/2.jpg', alt: 'Tank, photo 2 of 3' },
  { src: 'https://example.com/3.jpg', alt: 'Tank, photo 3 of 3' },
]

const open = (onClose = vi.fn()) => {
  renderWithProviders(<Lightbox title="Tank" photos={PHOTOS} start={0} onClose={onClose} />)
  return onClose
}

const current = () => screen.getAllByRole('img').find((img) => img.getAttribute('alt') !== '')

describe('wrapIndex', () => {
  it('steps forward and back, wrapping at both ends', () => {
    expect(wrapIndex(0, 1, 3)).toBe(1)
    expect(wrapIndex(2, 1, 3)).toBe(0)
    expect(wrapIndex(0, -1, 3)).toBe(2)
    expect(wrapIndex(1, -4, 3)).toBe(0)
    expect(wrapIndex(0, 1, 0)).toBe(0)
  })
})

describe('Lightbox', () => {
  it('opens on the first photo with its alt text and a counter', () => {
    open()
    expect(current()).toHaveAttribute('alt', 'Tank, photo 1 of 3')
    expect(screen.getByRole('heading', { name: 'Tank' })).toBeInTheDocument()
  })

  it('moves with the buttons, the arrow keys and the thumbnails', () => {
    open()
    const buttons = screen.getAllByRole('button')
    const next = buttons.find((b) => b.getAttribute('aria-label')?.match(/next|nākam/i))
    const previous = buttons.find((b) => b.getAttribute('aria-label')?.match(/previous|iepriekš/i))
    if (next === undefined || previous === undefined) throw new Error('no nav buttons')

    fireEvent.click(next)
    expect(current()).toHaveAttribute('alt', 'Tank, photo 2 of 3')
    fireEvent.click(previous)
    fireEvent.click(previous)
    expect(current()).toHaveAttribute('alt', 'Tank, photo 3 of 3')

    const dialog = document.querySelector('dialog')
    if (dialog === null) throw new Error('no dialog')
    fireEvent.keyDown(dialog, { key: 'ArrowRight' })
    expect(current()).toHaveAttribute('alt', 'Tank, photo 1 of 3')
    fireEvent.keyDown(dialog, { key: 'ArrowLeft' })
    expect(current()).toHaveAttribute('alt', 'Tank, photo 3 of 3')

    const thumbs = buttons.filter((b) => b.hasAttribute('aria-current') || b.querySelector('img'))
    const second = thumbs[1]
    if (second === undefined) throw new Error('no thumbnails')
    fireEvent.click(second)
    expect(current()).toHaveAttribute('alt', 'Tank, photo 2 of 3')
  })

  it('moves on a swipe and ignores a short drag', () => {
    // jsdom has no PointerEvent, and without one the coordinates are dropped.
    if (typeof window.PointerEvent === 'undefined') {
      vi.stubGlobal('PointerEvent', class extends MouseEvent {})
    }
    open()
    const photo = current()
    const stage = photo?.parentElement
    if (stage == null) throw new Error('no stage')
    fireEvent.pointerDown(stage, { clientX: 300 })
    fireEvent.pointerUp(stage, { clientX: 290 })
    expect(current()).toHaveAttribute('alt', 'Tank, photo 1 of 3')
    fireEvent.pointerDown(stage, { clientX: 300 })
    fireEvent.pointerUp(stage, { clientX: 200 })
    expect(current()).toHaveAttribute('alt', 'Tank, photo 2 of 3')
    vi.unstubAllGlobals()
  })

  it('closes on the close button and on Escape', () => {
    const onClose = open()
    const close = screen
      .getAllByRole('button')
      .find((b) => b.getAttribute('aria-label')?.match(/close|aizvērt/i))
    if (close === undefined) throw new Error('no close button')
    fireEvent.click(close)
    expect(onClose).toHaveBeenCalledTimes(1)

    const dialog = document.querySelector('dialog')
    if (dialog === null) throw new Error('no dialog')
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
