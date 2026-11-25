import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'

import { WhatsAppBubble } from './WhatsAppBubble'
import { SITE } from '@/config/site'
import { renderWithProviders } from '@/test/render'

describe('WhatsAppBubble', () => {
  it('links to a wa.me chat with a pre-filled, encoded message', () => {
    renderWithProviders(<WhatsAppBubble number="37120000000" />)

    const link = screen.getByRole('link', { name: new RegExp(SITE.name) })
    const href = link.getAttribute('href') ?? ''

    expect(href.startsWith('https://wa.me/37120000000?text=')).toBe(true)
    // Encoded: a raw space or a non-ASCII letter breaks the link on some clients.
    expect(href).not.toMatch(/\s/)
    expect(decodeURIComponent(href.split('text=')[1] ?? '')).toContain(SITE.name)

    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('renders nothing without a number', () => {
    const { container } = renderWithProviders(<WhatsAppBubble number="" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('is at least 44px on both axes, for touch', () => {
    renderWithProviders(<WhatsAppBubble number="37120000000" />)
    const link = screen.getByRole('link')
    expect(link.className).toMatch(/\bh-14\b/)
    expect(link.className).toMatch(/\bw-14\b/)
  })
})
