import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { CategoryFilter } from './CategoryFilter'

/** jsdom has no layout: give the row a width, a wider content and a scroll position that sticks. */
const overflowing = (row: HTMLElement, clientWidth: number, scrollWidth: number) => {
  let left = 0
  Object.defineProperty(row, 'clientWidth', { value: clientWidth })
  Object.defineProperty(row, 'scrollWidth', { value: scrollWidth })
  Object.defineProperty(row, 'scrollLeft', { get: () => left, set: (v: number) => (left = Math.max(0, Math.min(v, scrollWidth - clientWidth))) })
  return () => left
}

describe('CategoryFilter', () => {
  it('scrolls the chip row sideways with a plain mouse wheel, which has no sideways axis (MAP-08)', () => {
    renderWithProviders(<CategoryFilter counts={[{ id: 'skola', count: 3 }]} total={3} value={null} onChange={vi.fn()} />)
    const row = screen.getByRole('group', { name: 'Kategorijas' })
    const left = overflowing(row, 184, 2667)
    fireEvent.wheel(row, { deltaY: 120 })
    expect(left()).toBe(120)
    // A line-mode wheel (Firefox) moves a line at a time.
    fireEvent.wheel(row, { deltaY: 3, deltaMode: 1 })
    expect(left()).toBe(168)
    // A trackpad's sideways swipe is the browser's own; a row that fits is left alone.
    fireEvent.wheel(row, { deltaX: 50, deltaY: 10 })
    expect(left()).toBe(168)
  })
})

describe('CategoryFilter, every category within reach', () => {
  const COUNTS = [
    { id: 'skola' as const, count: 3 },
    { id: 'dzivnieku-patversme' as const, count: 2 },
  ]

  it('scrolls the row when dragged with the mouse, and a drag ending on a chip does not toggle it', () => {
    const onChange = vi.fn()
    renderWithProviders(<CategoryFilter counts={COUNTS} total={5} value={null} onChange={onChange} />)
    const row = screen.getByRole('group', { name: 'Kategorijas' })
    const left = overflowing(row, 184, 2667)
    fireEvent.pointerDown(row, { pointerType: 'mouse', button: 0, clientX: 300, pointerId: 1 })
    fireEvent.pointerMove(row, { pointerType: 'mouse', buttons: 1, clientX: 180, pointerId: 1 })
    expect(left()).toBe(120)
    fireEvent.pointerUp(row, { pointerType: 'mouse', clientX: 180, pointerId: 1 })
    fireEvent.click(screen.getByRole('button', { name: /Visas/ }))
    expect(onChange).not.toHaveBeenCalled()
    // A press that stays put is a plain click.
    fireEvent.pointerDown(row, { pointerType: 'mouse', button: 0, clientX: 100, pointerId: 2 })
    fireEvent.pointerMove(row, { pointerType: 'mouse', buttons: 1, clientX: 102, pointerId: 2 })
    fireEvent.pointerUp(row, { pointerType: 'mouse', clientX: 102, pointerId: 2 })
    fireEvent.click(screen.getByRole('button', { name: /Visas/ }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('stops dragging once the button is up, even when it was released outside the row', () => {
    const onChange = vi.fn()
    renderWithProviders(<CategoryFilter counts={COUNTS} total={5} value={null} onChange={onChange} />)
    const row = screen.getByRole('group', { name: 'Kategorijas' })
    const left = overflowing(row, 184, 2667)
    // Pressed on a chip, then moved straight down out of the row and released there: no pointerup reaches it.
    fireEvent.pointerDown(row, { pointerType: 'mouse', button: 0, buttons: 1, clientX: 300, pointerId: 1 })
    fireEvent.pointerMove(row, { pointerType: 'mouse', buttons: 1, clientX: 301, pointerId: 1 })
    // Later the mouse hovers back over the row with no button pressed: the row stays where it is.
    fireEvent.pointerMove(row, { pointerType: 'mouse', buttons: 0, clientX: 200, pointerId: 1 })
    fireEvent.pointerMove(row, { pointerType: 'mouse', buttons: 0, clientX: 100, pointerId: 1 })
    expect(left()).toBe(0)
    // And the next click on a chip is a click.
    fireEvent.click(screen.getByRole('button', { name: /Visas/ }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('stops dragging when the row loses the pointer', () => {
    renderWithProviders(<CategoryFilter counts={COUNTS} total={5} value={null} onChange={vi.fn()} />)
    const row = screen.getByRole('group', { name: 'Kategorijas' })
    const left = overflowing(row, 184, 2667)
    fireEvent.pointerDown(row, { pointerType: 'mouse', button: 0, buttons: 1, clientX: 300, pointerId: 1 })
    fireEvent.lostPointerCapture(row, { pointerType: 'mouse', pointerId: 1 })
    fireEvent.pointerMove(row, { pointerType: 'mouse', buttons: 1, clientX: 100, pointerId: 1 })
    expect(left()).toBe(0)
  })

  it('leaves touch to the browser\'s own scrolling', () => {
    renderWithProviders(<CategoryFilter counts={COUNTS} total={5} value={null} onChange={vi.fn()} />)
    const row = screen.getByRole('group', { name: 'Kategorijas' })
    const left = overflowing(row, 184, 2667)
    fireEvent.pointerDown(row, { pointerType: 'touch', button: 0, clientX: 300, pointerId: 1 })
    fireEvent.pointerMove(row, { pointerType: 'touch', clientX: 100, pointerId: 1 })
    expect(left()).toBe(0)
  })
})

describe('CategoryFilter, laid out all at once', () => {
  const COUNTS = [
    { id: 'skola' as const, count: 3 },
    { id: 'dzivnieku-patversme' as const, count: 2 },
  ]
  let restore: () => void = () => undefined
  beforeEach(() => {
    // Every element is wider inside than out: the row overflows from its first measure.
    const scroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth')
    const client = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth')
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get: () => 2000 })
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 200 })
    restore = () => {
      if (scroll) Object.defineProperty(HTMLElement.prototype, 'scrollWidth', scroll)
      if (client) Object.defineProperty(HTMLElement.prototype, 'clientWidth', client)
    }
  })
  afterEach(() => restore())

  it('offers a chevron when the chips do not fit, which wraps them all into view and folds them back', () => {
    const onChange = vi.fn()
    renderWithProviders(<CategoryFilter counts={COUNTS} total={5} value={null} onChange={onChange} />)
    const row = screen.getByRole('group', { name: 'Kategorijas' })
    expect(row).toHaveClass('overflow-x-auto', 'dp-fade-x')
    const more = screen.getByRole('button', { name: 'Rādīt visas kategorijas' })
    expect(more).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(more)
    expect(row).toHaveClass('flex-wrap')
    expect(row).not.toHaveClass('overflow-x-auto')
    expect(row).not.toHaveClass('dp-fade-x')
    const fewer = screen.getByRole('button', { name: 'Rādīt mazāk kategoriju' })
    expect(fewer).toHaveAttribute('aria-expanded', 'true')

    // Choosing a category folds the list back, so the map is in view again.
    fireEvent.click(screen.getByRole('button', { name: /Skolas|skola/i }))
    expect(onChange).toHaveBeenCalledWith('skola')
    expect(row).toHaveClass('overflow-x-auto')
  })

  it('pads the row\'s end by the whole fade, so the last chip can be scrolled fully clear of it', () => {
    renderWithProviders(<CategoryFilter counts={COUNTS} total={5} value={null} onChange={vi.fn()} />)
    const row = screen.getByRole('group', { name: 'Kategorijas' })
    // The fade (chrome.css) is 4.5rem wide: Tailwind's pr-18.
    expect(row).toHaveClass('dp-fade-x', 'pr-18')
  })

  it('lays the open list out on a line of its own, each chip free to wrap its name, so none runs off the screen', () => {
    renderWithProviders(<CategoryFilter counts={COUNTS} total={5} value={null} onChange={vi.fn()} />)
    const row = screen.getByRole('group', { name: 'Kategorijas' })
    const outer = row.parentElement
    expect(outer).not.toHaveClass('basis-full')
    fireEvent.click(screen.getByRole('button', { name: 'Rādīt visas kategorijas' }))
    expect(outer).toHaveClass('basis-full')
    const chip = screen.getByRole('button', { name: /Skolas|skola/i })
    expect(chip).toHaveClass('max-w-full', 'whitespace-normal', 'h-auto', 'min-h-11')
    expect(chip).not.toHaveClass('whitespace-nowrap', 'h-11')
  })
})

describe('CategoryFilter, measured again as its chips change', () => {
  it('offers the chevron once the counts grow wider, at the same number of chips and the same row width', () => {
    const scroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth')
    const client = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth')
    let content = 150
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get: () => content })
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 200 })
    try {
      const props = (count: number) => ({ counts: [{ id: 'skola' as const, count }], total: count, value: null, onChange: vi.fn() })
      const { rerender } = renderWithProviders(<CategoryFilter {...props(3)} />)
      expect(screen.queryByRole('button', { name: 'Rādīt visas kategorijas' })).toBeNull()
      content = 260
      rerender(<CategoryFilter {...props(1234)} />)
      expect(screen.getByRole('button', { name: 'Rādīt visas kategorijas' })).toBeInTheDocument()
    } finally {
      if (scroll) Object.defineProperty(HTMLElement.prototype, 'scrollWidth', scroll)
      if (client) Object.defineProperty(HTMLElement.prototype, 'clientWidth', client)
    }
  })
})
