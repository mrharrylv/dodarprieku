import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'

import { COMPANY, CONTACT, HA_GROUP_PROJECTS, ROUTES } from '@/config/site'
import { resources } from '@/i18n'
import { renderWithProviders } from '@/test/render'
import { BrandMark } from './BrandMark'
import { CompanyDetails } from './CompanyDetails'
import { OtherProjects } from './OtherProjects'
import { RegisterButton } from './RegisterButton'

const common = resources.lv.common

describe('OtherProjects', () => {
  it('links every HA Group project in a new tab, saying so to a screen reader', () => {
    renderWithProviders(<OtherProjects />)

    const nav = screen.getByRole('navigation', { name: common.a11y.projectsNavigation })
    expect(within(nav).getByRole('heading', { name: common.footer.projectsHeading })).toBeInTheDocument()
    for (const project of HA_GROUP_PROJECTS) {
      const link = within(nav).getByRole('link', { name: new RegExp(project.name) })
      expect(link).toHaveAttribute('href', project.url)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
      expect(link).toHaveTextContent(common.a11y.opensInNewTab)
      expect(link.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
    }
  })
})

describe('CompanyDetails', () => {
  it('shows the legal name, numbers, address and email, and no phone', () => {
    const { container } = renderWithProviders(<CompanyDetails />)

    expect(screen.getByText(COMPANY.legalName)).toBeInTheDocument()
    expect(screen.getByText(`Reģ. Nr. ${COMPANY.registrationNumber}`)).toBeInTheDocument()
    expect(screen.getByText(`PVN ${COMPANY.vatNumber}`)).toBeInTheDocument()
    expect(screen.getByText('Koku iela 10-59, Rīga, LV-1004')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: CONTACT.email })).toHaveAttribute('href', `mailto:${CONTACT.email}`)
    expect(container.textContent).not.toContain(CONTACT.phone)
  })
})

describe('RegisterButton', () => {
  it('links to the registration wizard', () => {
    renderWithProviders(<RegisterButton />)
    expect(screen.getByRole('link', { name: common.cta.register })).toHaveAttribute('href', ROUTES.register)
  })
})

describe('BrandMark', () => {
  it('is decorative', () => {
    const { container } = renderWithProviders(<BrandMark className="h-4" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg?.getAttribute('class')).toContain('h-4')
  })
})
