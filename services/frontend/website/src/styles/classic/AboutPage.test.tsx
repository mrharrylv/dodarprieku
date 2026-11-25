import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HA_GROUP_PROJECTS, ROUTES } from '@/config/site'
import { resources } from '@/i18n'
import { renderWithProviders } from '@/test/render'
import { AboutPage } from './AboutPage'

const about = resources.lv.about
const common = resources.lv.common

describe('classic AboutPage', () => {
  it('has one h1 and a way back to the map', () => {
    renderWithProviders(<AboutPage />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const back = screen.getAllByRole('link', { name: about.backToMap })
    expect(back.length).toBeGreaterThan(0)
    expect(back.every((link) => link.getAttribute('href') === ROUTES.home)).toBe(true)
  })

  it("explains a donor's three steps, \"Es ziedošu\" among them", () => {
    renderWithProviders(<AboutPage />)
    const section = screen.getByRole('heading', { level: 2, name: about.how.title }).closest('section')!
    const steps = within(section).getAllByRole('listitem')
    expect(steps).toHaveLength(3)
    expect(steps[1]).toHaveTextContent('Es ziedošu')
  })

  it('invites institutions, in four steps, to register', () => {
    renderWithProviders(<AboutPage />)
    const heading = screen.getByRole('heading', { level: 2, name: about.institutions.title })
    const section = heading.closest('section')!
    expect(within(section).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      about.institutions.steps.register.title,
      about.institutions.steps.approve.title,
      about.institutions.steps.map.title,
      about.institutions.steps.help.title,
    ])
    expect(within(section).getByRole('link', { name: /Kļūt par saņēmēju/ })).toHaveAttribute('href', ROUTES.register)
    expect(within(section).getByRole('link', { name: about.institutions.account })).toHaveAttribute('href', ROUTES.account)
  })

  it("presents HA Group's other projects, each with its description, in a new tab", () => {
    renderWithProviders(<AboutPage />)
    const section = screen.getByRole('heading', { level: 2, name: about.projects.title }).closest('section')!
    const links = within(section).getAllByRole('link')
    expect(links).toHaveLength(HA_GROUP_PROJECTS.length)
    HA_GROUP_PROJECTS.forEach((project, index) => {
      const link = links[index]!
      expect(link).toHaveAttribute('href', project.url)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveTextContent(project.name)
      expect(link).toHaveTextContent(common.projects[project.id])
      expect(within(link).getByRole('img', { name: `${project.name} logotips` })).toHaveAttribute('src', project.logo)
    })
  })

  it('names who runs it, from the legal values', () => {
    renderWithProviders(<AboutPage />)
    expect(screen.getByRole('heading', { level: 3, name: about.principles.operator.title }).parentElement).not.toHaveTextContent('{{')
  })
})
