import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import i18n from '@/i18n'
import { renderWithProviders } from '@/test/render'
import { Header } from './Header'

const t = i18n.getFixedT('en', 'common')

describe('split mobile menu', () => {
  it('stays in the document while closed, hidden, and shows when opened', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(<Header />)
    const menu = container.querySelector('#split-menu')

    expect(menu).toBeInTheDocument()
    expect(menu).toHaveAttribute('aria-hidden', 'true')
    expect(menu).toHaveAttribute('inert')

    await user.click(screen.getByRole('button', { name: t('nav.openMenu') }))

    expect(menu).toHaveAttribute('aria-hidden', 'false')
    expect(menu).not.toHaveAttribute('inert')
  })
})
