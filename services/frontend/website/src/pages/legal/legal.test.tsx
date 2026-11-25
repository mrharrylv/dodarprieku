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
  ['privacy', <PrivacyPage key="p" />, /privātuma politika/i],
  ['cookies', <CookiesPage key="c" />, /sīkdatņu politika/i],
  ['terms', <TermsPage key="t" />, /lietošanas noteikumi/i],
  ['company', <CompanyPage key="co" />, /uzņēmuma rekvizīti/i],
] as const

describe.each(PAGES)('the %s page', (_name, element, heading) => {
  it('renders its heading', () => {
    renderWithProviders(element)
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })

  it('shows a last-updated date', () => {
    renderWithProviders(element)
    expect(screen.getByText(/atjaunināts/i)).toBeInTheDocument()
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

  it('names the map tiles and the address search, the only third parties', () => {
    renderWithProviders(<CookiesPage />)
    expect(screen.getByText(/tiles\.openfreemap\.org/)).toBeInTheDocument()
    expect(screen.getByText(/tiles\.openfreemap\.org/).textContent).toMatch(/nominatim\.openstreetmap\.org/)
  })

  it('describes the session cookie, by name', () => {
    renderWithProviders(<CookiesPage />)
    expect(screen.getByText(/dodar_session/)).toBeInTheDocument()
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
    expect(screen.getAllByText(/nav publicēts/i).length).toBeGreaterThan(0)
  })
})

describe('the privacy policy', () => {
  it('names the supervisory authority a complaint goes to', () => {
    renderWithProviders(<PrivacyPage />)
    // GDPR Art. 13(2)(d): the notice must say where to complain.
    expect(screen.getByText(/datu valsts inspekcij/i)).toBeInTheDocument()
  })

  it('lists the data subject rights', () => {
    renderWithProviders(<PrivacyPage />)
    expect(screen.getByText(/15\. pants/)).toBeInTheDocument()
    expect(screen.getByText(/17\. pants/)).toBeInTheDocument()
  })

  it('says where the data is stored and who sends the emails', () => {
    renderWithProviders(<PrivacyPage />)
    expect(screen.getByText(/eu-north-1/)).toBeInTheDocument()
    expect(screen.getByText(/Amazon Simple Email Service/).textContent).toContain('info@hagroup.lv')
  })
})
