import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

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
