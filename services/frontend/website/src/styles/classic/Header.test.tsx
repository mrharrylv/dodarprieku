import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { Header } from './Header'

describe('classic Header mobile menu', () => {
  it('is in the document while closed, hidden, and shows when toggled', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(<Header />)

    const menu = container.querySelector('#mobile-menu')
    expect(menu).not.toBeNull()
    expect(menu).toHaveAttribute('aria-hidden', 'true')
    expect(menu).toHaveAttribute('inert')

    await user.click(screen.getByRole('button', { expanded: false }))

    expect(menu).toHaveAttribute('aria-hidden', 'false')
    expect(menu).not.toHaveAttribute('inert')
  })
})
