import { describe, expect, it, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { STORAGE_KEYS } from '@/config/site'
import { renderWithProviders } from '@/test/render'
import { ThemeToggle } from './ThemeToggle'

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

describe('ThemeToggle', () => {
  it('switches light to dark and back, with no third "system" state', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(STORAGE_KEYS.theme, 'light')
    renderWithProviders(<ThemeToggle />)

    const button = screen.getByRole('button')
    await user.click(button)
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(window.localStorage.getItem(STORAGE_KEYS.theme)).toBe('dark')

    await user.click(button)
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(window.localStorage.getItem(STORAGE_KEYS.theme)).toBe('light')

    await user.click(button)
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('names the theme it switches to', () => {
    window.localStorage.setItem(STORAGE_KEYS.theme, 'dark')
    renderWithProviders(<ThemeToggle />)
    expect(screen.getByRole('button').getAttribute('aria-label')).toMatch(/light|gaiš|светл/i)
  })
})
