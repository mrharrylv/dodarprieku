import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { DemoNotice } from './DemoNotice'

/** Tailwind's spacing scale: one step is 0.25rem; `bottom-[5.5rem]` is read as written. */
const remOf = (cls: string | undefined): number => {
  const value = cls?.replace(/^(md:)?bottom-/, '') ?? ''
  const arbitrary = /^\[([\d.]+)rem\]$/.exec(value)
  return arbitrary !== null ? Number(arbitrary[1]) : Number(value) * 0.25
}

/**
 * jsdom has no layout, so the placement is checked from the classes (MAP-09).
 * The button's hit area hangs 0.625rem (`-my-2.5`) below the 1.5rem pill.
 * On a phone the bottom band holds the map attribution and, above it, the
 * two buttons stacked (`bottom-9`, 2.75rem each and a 0.5rem gap, so up to
 * 8.25rem): the pill sits
 * above both. From `md` the register button is in the top corner and the
 * pill's hit area must stay inside the map.
 */
describe('DemoNotice', () => {
  it('sits above the phone\'s register button and the attribution, and inside the map from md', () => {
    renderWithProviders(<DemoNotice />)
    const classes = screen.getByRole('note').className.split(/\s+/)
    const phone = classes.find((c) => /^bottom-/.test(c))
    const wide = classes.find((c) => /^md:bottom-/.test(c))
    expect(remOf(phone) - 0.625).toBeGreaterThanOrEqual(8.25)
    expect(remOf(wide) - 0.625).toBeGreaterThanOrEqual(0)
  })

  it('follows the docked panel\'s edge over the slide\'s own time and curve', () => {
    renderWithProviders(<DemoNotice />)
    expect(screen.getByRole('note')).toHaveClass('transition-[left]', 'duration-(--dock-motion)', 'ease-(--dock-ease)')
  })
})
