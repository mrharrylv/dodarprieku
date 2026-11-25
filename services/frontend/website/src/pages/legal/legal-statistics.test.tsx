import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '@/test/render'

const analytics = vi.hoisted(() => ({ on: true }))

vi.mock('@/config/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/config/env')>()),
  hasAnalytics: () => analytics.on,
}))

const { PrivacyPage } = await import('./PrivacyPage')
const { CookiesPage } = await import('./CookiesPage')

/**
 * The legal pages must say what the site actually does with visit statistics:
 * a policy that says "no analytics" on a site reporting every page view to the
 * CRM is false, and so is one describing statistics a site has turned off.
 */
beforeEach(() => {
  analytics.on = true
})

describe('visit statistics in the legal pages', () => {
  it('the privacy policy describes them, names the CRM host and lists the developer as a processor', () => {
    renderWithProviders(<PrivacyPage />)
    expect(screen.getByRole('heading', { name: /visit statistics/i })).toBeInTheDocument()
    expect(screen.getByText(/crm\.hagroup\.lv/)).toBeInTheDocument()
    expect(screen.getByText(/HA Group, our web developer/)).toBeInTheDocument()
    expect(screen.queryByText(/there is no analytics/i)).not.toBeInTheDocument()
  })

  it('the cookie policy says they set no cookie', () => {
    renderWithProviders(<CookiesPage />)
    expect(screen.getByRole('heading', { name: /visit statistics without cookies/i })).toBeInTheDocument()
  })

  it('with statistics off, the policies say there is no analytics and mention no CRM', () => {
    analytics.on = false
    const { container } = renderWithProviders(<PrivacyPage />)
    expect(screen.getByText(/there is no analytics/i)).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/visit statistics|hagroup/i)
    const cookies = renderWithProviders(<CookiesPage />)
    expect(cookies.container.textContent).not.toMatch(/visit statistics/i)
  })
})
