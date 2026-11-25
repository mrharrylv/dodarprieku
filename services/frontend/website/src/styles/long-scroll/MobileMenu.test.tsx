import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { MobileMenu } from './MobileMenu'

const Harness = () => {
  const [open, setOpen] = useState(false)
  return (
    <MemoryRouter initialEntries={['/lv']}>
      <button type="button" onClick={() => setOpen((v) => !v)}>
        toggle
      </button>
      <MobileMenu id="menu" open={open} isCurrent={() => false} onNavigate={() => setOpen(false)} />
    </MemoryRouter>
  )
}

describe('long-scroll MobileMenu', () => {
  it('is in the document while closed, hidden and inert, and shows when opened', async () => {
    const user = userEvent.setup()
    const { container } = render(<Harness />)
    const menu = container.querySelector('#menu')

    expect(menu).not.toBeNull()
    expect(menu?.getAttribute('aria-hidden')).toBe('true')
    expect(menu?.hasAttribute('inert')).toBe(true)

    await user.click(screen.getByRole('button', { name: 'toggle' }))

    expect(menu?.getAttribute('aria-hidden')).toBe('false')
    expect(menu?.hasAttribute('inert')).toBe(false)
  })
})
