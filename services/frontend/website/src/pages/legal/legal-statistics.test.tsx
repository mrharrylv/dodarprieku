import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'

import { resources } from '@/i18n'
import { renderWithProviders } from '@/test/render'

const flags = vi.hoisted(() => ({ stats: true, ga: false }))

vi.mock('@/config/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/config/env')>()),
  hasAnalytics: () => flags.stats,
  hasGoogleAnalytics: () => flags.ga,
}))

const { PrivacyPage } = await import('./PrivacyPage')
const { CookiesPage } = await import('./CookiesPage')

const legal = resources.lv.legal

/**
 * The legal pages must say what the site actually does: the CRM's visit
 * statistics exactly while they are on, and Google Analytics exactly on a
 * build that may load it (production, with a measurement id).
 */
beforeEach(() => {
  flags.stats = true
  flags.ga = false
})

describe('visit statistics in the legal pages', () => {
  it('the privacy policy describes them, names the CRM host and lists the developer as a processor', () => {
    renderWithProviders(<PrivacyPage />)
    expect(screen.getByRole('heading', { name: legal.privacy.statistics.title })).toBeInTheDocument()
    expect(screen.getAllByText(/crm\.hagroup\.lv/).length).toBeGreaterThan(0)
    expect(screen.getByText(/HA Group, mūsu tīmekļa izstrādātājs/)).toBeInTheDocument()
  })

  it('the cookie policy says they set no cookie', () => {
    renderWithProviders(<CookiesPage />)
    expect(screen.getByRole('heading', { name: legal.cookies.statistics.title })).toBeInTheDocument()
  })

  it('with statistics off, the policies mention no CRM', () => {
    flags.stats = false
    const { container } = renderWithProviders(<PrivacyPage />)
    expect(container.textContent).not.toContain(legal.privacy.statistics.title)
    expect(container.textContent).not.toMatch(/crm\.hagroup/i)
    const cookies = renderWithProviders(<CookiesPage />)
    expect(cookies.container.textContent).not.toContain(legal.cookies.statistics.title)
  })
})

describe('Google Analytics in the legal pages', () => {
  it('is not mentioned on a build that cannot load it', () => {
    const privacy = renderWithProviders(<PrivacyPage />)
    expect(privacy.container.textContent).not.toMatch(/Google Analytics/)
    const cookies = renderWithProviders(<CookiesPage />)
    expect(cookies.container.textContent).not.toMatch(/_ga/)
  })

  it('is described, as consent-only, where it may load', () => {
    flags.ga = true
    renderWithProviders(<PrivacyPage />)
    expect(screen.getByRole('heading', { name: legal.privacy.analytics.title })).toBeInTheDocument()
    expect(screen.getByText(legal.privacy.sharing.analytics)).toBeInTheDocument()
    const cookies = renderWithProviders(<CookiesPage />)
    expect(cookies.container.textContent).toContain(legal.cookies.analytics.body)
  })
})
