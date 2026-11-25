import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { ThemeProvider } from '@/context/ThemeProvider'

import { Header } from './Header'

describe('paged mobile menu', () => {
  it('stays in the document, hidden while closed, and shows when toggled', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/lv']}>
        <ThemeProvider>
          <Header />
        </ThemeProvider>
      </MemoryRouter>,
    )

    const menu = document.getElementById('paged-menu')
    expect(menu).not.toBeNull()
    expect(menu).toHaveAttribute('aria-hidden', 'true')
    expect(menu).toHaveAttribute('inert')

    await user.click(screen.getByRole('button', { name: /menu/i }))

    expect(menu).toHaveAttribute('aria-hidden', 'false')
    expect(menu).not.toHaveAttribute('inert')
  })
})
