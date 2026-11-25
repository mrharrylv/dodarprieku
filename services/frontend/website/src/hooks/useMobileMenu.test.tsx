import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useNavigate, type NavigateFunction } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { useMobileMenu } from './useMobileMenu'

let navigate: NavigateFunction = () => undefined

const Harness = () => {
  navigate = useNavigate()
  const { open, toggle, close, toggleRef } = useMobileMenu()
  return (
    <>
      <button ref={toggleRef} type="button" onClick={toggle} aria-expanded={open}>
        menu
      </button>
      {open && (
        <nav>
          <button type="button" onClick={close}>
            link
          </button>
        </nav>
      )}
    </>
  )
}

const renderMenu = () =>
  render(
    <MemoryRouter initialEntries={['/lv']}>
      <Harness />
    </MemoryRouter>,
  )

const toggle = () => screen.getByRole('button', { name: 'menu' })

describe('useMobileMenu', () => {
  it('starts closed, and the toggle opens and closes it', async () => {
    const user = userEvent.setup()
    renderMenu()
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle())
    expect(toggle()).toHaveAttribute('aria-expanded', 'true')

    await user.click(toggle())
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
  })

  it('close() closes it', async () => {
    const user = userEvent.setup()
    renderMenu()
    await user.click(toggle())
    await user.click(screen.getByRole('button', { name: 'link' }))
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('closes when the address changes, with no frame of the new page under the old menu', async () => {
    const user = userEvent.setup()
    renderMenu()
    await user.click(toggle())
    expect(screen.getByRole('navigation')).toBeInTheDocument()

    act(() => {
      void navigate('/lv/about')
    })
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('Escape closes it and puts focus back on the toggle', async () => {
    const user = userEvent.setup()
    renderMenu()
    await user.click(toggle())
    screen.getByRole('button', { name: 'link' }).focus()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(toggle()).toHaveFocus()
  })

  it('locks the page behind the open menu and releases it on close', async () => {
    const user = userEvent.setup()
    renderMenu()
    await user.click(toggle())
    expect(document.body.style.position).toBe('fixed')

    await user.click(toggle())
    expect(document.body.style.position).toBe('')
  })
})
