import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'

import { renderWithProviders } from '@/test/render'
import { STORAGE_KEYS } from '@/config/site'
import { PrivacyPage } from './PrivacyPage'
import { CookiesPage } from './CookiesPage'
import { TermsPage } from './TermsPage'
import { CompanyPage } from './CompanyPage'

/**
 * Legal pages are the ones nobody reads until they matter, which is exactly why
 * they need tests. The failures worth catching are a page that renders raw
 * translation keys, and a page that publishes a placeholder as if it were fact.
 */

const PAGES = [
  ['privacy', <PrivacyPage key="p" />, /privacy policy/i],
  ['cookies', <CookiesPage key="c" />, /cookie policy/i],
  ['terms', <TermsPage key="t" />, /terms of service/i],
  ['company', <CompanyPage key="co" />, /company details/i],
] as const

describe.each(PAGES)('the %s page', (_name, element, heading) => {
  it('renders its heading', () => {
    renderWithProviders(element)
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })

  it('shows a last-updated date', () => {
    renderWithProviders(element)
    expect(screen.getByText(/last updated/i)).toBeInTheDocument()
  })

  it('renders translated prose, not raw keys', () => {
    const { container } = renderWithProviders(element)

    // A missing key renders as "privacy.intro": visible nonsense on a page
    // that is supposed to be a legal statement.
    expect(container.textContent).not.toMatch(/\b(privacy|cookies|terms|company)\.[a-z]+\./)
  })
})

describe('the cookie policy', () => {
  it('lists every key the site writes to local storage', () => {
    renderWithProviders(<CookiesPage />)

    const table = screen.getByRole('table')

    // The policy states exactly what is stored. A key present in code but
    // absent here makes the published policy false, which is why the table is
    // generated from STORAGE_KEYS rather than typed out.
    for (const key of Object.values(STORAGE_KEYS)) {
      expect(within(table).getByText(key)).toBeInTheDocument()
    }
  })

  it('states that no third party is contacted', () => {
    renderWithProviders(<CookiesPage />)
    expect(screen.getByText(/no request to any third party/i)).toBeInTheDocument()
  })
})

describe('the company page', () => {
  it('never publishes a placeholder value', () => {
    const { container } = renderWithProviders(<CompanyPage />)

    // config/site.ts ships 40203XXXXXX and LV00XXXX... A plausible-looking fake
    // registration number on a live legal page is a real problem, not a
    // cosmetic one.
    expect(container.textContent).not.toMatch(/X{3,}/)
  })

  it('treats every template stand-in as a placeholder, not only the X runs', () => {
    const { container } = renderWithProviders(<CompanyPage />)

    // The same test organizationJsonLd applies (lib/placeholder.ts): an
    // example.com address or a phone number of zeros is as fake as 40203XXXXXX.
    const rows = [...container.querySelectorAll('dd')].map((dd) => dd.textContent ?? '')
    for (const value of rows) {
      expect(value).not.toMatch(/example|0{3} ?0{3}$/i)
    }
  })

  it('says "not published" instead, so the gap is visible', () => {
    renderWithProviders(<CompanyPage />)
    expect(screen.getAllByText(/not published/i).length).toBeGreaterThan(0)
  })
})

describe('the privacy policy', () => {
  it('names the supervisory authority a complaint goes to', () => {
    renderWithProviders(<PrivacyPage />)
    // GDPR Art. 13(2)(d): the notice must say where to complain.
    expect(screen.getByText(/data state inspectorate/i)).toBeInTheDocument()
  })

  it('lists the data subject rights', () => {
    renderWithProviders(<PrivacyPage />)
    expect(screen.getByText(/Art. 15/)).toBeInTheDocument()
    expect(screen.getByText(/Art. 17/)).toBeInTheDocument()
  })
})
