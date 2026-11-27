import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ok } from '../test/fetch'
import { detail, profile, summary } from '../test/fixtures'
import { renderApp } from '../test/render'

const claim = { charityId: 'imp-1', name: 'Ulubele (reģistrs)', slug: 'ulubele' }
const claimDetail = detail({
  id: 'p1',
  status: 'pending',
  passwordSet: false,
  claim,
  claimProfile: profile({ description: 'No reģistra.', needs: [] }),
})

describe('claim applications', () => {
  it('marks a claim in the list', async () => {
    renderApp('/pieteikumi', {
      'GET /api/admin/charities?status=pending': () => ok([summary({ id: 'p1', status: 'pending', claim })]),
    })
    expect(await screen.findByText('Pieprasījums esošam profilam: Ulubele (reģistrs)')).toBeInTheDocument()
  })

  it('links to the imported charity and diffs it against the submitted profile', async () => {
    renderApp('/pieteikumi/p1', { 'GET /api/admin/charities/p1': () => ok(claimDetail) })
    const section = await screen.findByRole('region', { name: 'Pieprasījums esošam profilam: Ulubele (reģistrs)' })
    expect(within(section).getByRole('link', { name: 'Atvērt esošo profilu' })).toHaveAttribute('href', '/organizacijas/imp-1')
    expect(within(section).getByRole('columnheader', { name: 'Importētais profils' })).toBeInTheDocument()
    expect(within(section).getByRole('columnheader', { name: 'Iesniegtais profils' })).toBeInTheDocument()
    expect(within(section).getByText('No reģistra.')).toBeInTheDocument()
  })

  it('warns when the claimant email does not fit the public contacts, and says the admin must check', async () => {
    renderApp('/pieteikumi/p1', { 'GET /api/admin/charities/p1': () => ok({ ...claimDetail, accountEmail: 'kads@gmail.com' }) })
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Vai pieteicējs tiešām pārstāv iestādi?')
    expect(alert).toHaveTextContent('kads@gmail.com (gmail.com) nesakrīt ar iestādes publisko e-pastu vai mājaslapu')
    expect(alert).toHaveTextContent('piezvaniet uz iestādes publisko tālruni')
  })

  it('notes a match with the public email domain', async () => {
    renderApp('/pieteikumi/p1', { 'GET /api/admin/charities/p1': () => ok({ ...claimDetail, accountEmail: 'vadiba@ulubele.example' }) })
    expect(await screen.findByText(/sakrīt ar iestādes publisko kontaktu \(ulubele\.example\)/)).toBeInTheDocument()
  })

  it('approves the claim and opens the merged charity', async () => {
    // A name of its own: the application page's h1 carries the fixture default,
    // and matching that one would race the navigation away from it.
    const merged = detail({ id: 'imp-1', name: 'Patversme Ulubele (apvienota)', status: 'approved' })
    const { calls } = renderApp('/pieteikumi/p1', {
      'GET /api/admin/charities/p1': () => ok(claimDetail),
      'POST /api/admin/charities/p1/approve': () => ok({ ...merged, mailSent: true }),
      'GET /api/admin/charities/imp-1': () => ok(merged),
      'GET /api/admin/charities/imp-1/subscribers': () => ok([]),
    })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Apstiprināt' }))
    const dialog = screen.getByRole('dialog', { name: 'Apstiprināt pieteikumu?' })
    expect(dialog).toHaveTextContent('citi šī profila pieprasījumi tiks noraidīti')
    await user.click(within(dialog).getByRole('button', { name: 'Apstiprināt' }))
    expect(await screen.findByText('Pieprasījums apstiprināts, profils apvienots.')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Patversme Ulubele (apvienota)', level: 1 }, { timeout: 5000 })).toBeInTheDocument()
    expect(calls.some((c) => c.url === '/api/admin/charities/imp-1')).toBe(true)
  })
})

describe('pledges table', () => {
  it('shows the company column', async () => {
    renderApp('/ziedojumi', {
      'GET /api/admin/charities': () => ok([summary()]),
      'GET /api/admin/pledges': () =>
        ok([{ id: 'x', charityId: 'c1', needs: [], anonymous: false, name: 'Jānis', company: 'SIA Koks', createdAt: '2026-11-20T00:00:00Z' }]),
    })
    expect(await screen.findByRole('cell', { name: 'SIA Koks' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Uzņēmums' })).toBeInTheDocument()
  })
})
