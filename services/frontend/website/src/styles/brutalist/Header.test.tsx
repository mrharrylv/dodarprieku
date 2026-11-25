import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '@/test/render'
import { Header } from './Header'

const MENU_ID = 'mobile-menu'

describe('brutalist mobile menu', () => {
  it('stays in the page while closed, hidden, and is revealed when opened', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Header />, { route: '/en' })

    const menu = document.getElementById(MENU_ID)
    expect(menu).toBeInTheDocument()
    expect(menu).toHaveAttribute('aria-hidden', 'true')
    expect(menu).toHaveAttribute('inert')

    await user.click(screen.getByRole('button', { name: /open menu/i }))
    expect(menu).toHaveAttribute('aria-hidden', 'false')
    expect(menu).not.toHaveAttribute('inert')

    await user.click(screen.getByRole('button', { name: /close menu/i }))
    expect(menu).toHaveAttribute('aria-hidden', 'true')
  })
})
