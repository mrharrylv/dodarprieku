import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { fail, ok } from '../test/fetch'
import { detail, summary } from '../test/fixtures'
import { renderApp } from '../test/render'

const rows = [
  summary({ id: '1', name: 'Ulubele', city: 'Ādaži', status: 'approved', views: 5 }),
  summary({ id: '2', name: 'Bērnu nams', city: 'Rīga', category: 'bernu-nams', status: 'pending', passwordSet: false }),
  summary({ id: '3', name: 'Zupas virtuve', city: 'Rīga', category: 'zupas-virtuve', status: 'suspended', hasPendingUpdate: true }),
]
const names = () => screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[0]?.textContent)

describe('organisations table', () => {
  it('searches, filters by status and category, and sorts by column', async () => {
    renderApp('/organizacijas', { 'GET /api/admin/charities': () => ok(rows) })
    const user = userEvent.setup()
    await screen.findByRole('table')
    expect(screen.getByText('Rādītas 3 no 3')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Meklēt'), 'riga')
    expect(names()).toEqual(['Bērnu nams', 'Zupas virtuve'])
    expect(screen.getByText('Rādītas 2 no 3')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Statuss'), 'update')
    expect(names()).toEqual(['Zupas virtuve'])
    await user.selectOptions(screen.getByLabelText('Statuss'), 'all')
    await user.selectOptions(screen.getByLabelText('Kategorija'), 'bernu-nams')
    expect(names()).toEqual(['Bērnu nams'])
    await user.selectOptions(screen.getByLabelText('Kategorija'), 'slimnica')
    expect(screen.getByText('Neviena organizācija neatbilst filtriem.')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Kategorija'), 'all')
    await user.clear(screen.getByLabelText('Meklēt'))
    const byName = screen.getByRole('button', { name: 'Kārtot pēc: Nosaukums' })
    await user.click(byName)
    expect(names()).toEqual(['Bērnu nams', 'Ulubele', 'Zupas virtuve'])
    expect(byName.closest('th')).toHaveAttribute('aria-sort', 'ascending')
    await user.click(byName)
    expect(names()).toEqual(['Zupas virtuve', 'Ulubele', 'Bērnu nams'])
    expect(screen.getAllByText('Nav').length).toBe(1)
  })
})

describe('organisation detail', () => {
  const live = detail({ id: '1', status: 'approved', name: 'Patversme Ulubele' })

  it('suspends with a reason', async () => {
    const { calls } = renderApp('/organizacijas/1', {
      'GET /api/admin/charities/1': () => ok(live),
      'POST /api/admin/charities/1/suspend': () => ok({ ...live, status: 'suspended', suspendReason: 'Pārbaude' }),
    })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Apturēt' }))
    const dialog = screen.getByRole('dialog', { name: 'Apturēt organizāciju' })
    await user.type(within(dialog).getByLabelText('Iemesls'), 'Pārbaude')
    await user.click(within(dialog).getByRole('button', { name: 'Apturēt' }))
    expect(await screen.findByText('Organizācija apturēta.')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Atjaunot' })).toBeInTheDocument()
    expect(screen.getByText('Pārbaude')).toBeInTheDocument()
    expect(calls.find((c) => c.url.endsWith('/suspend'))?.body).toEqual({ reason: 'Pārbaude' })
  })

  it('restores a suspended organisation', async () => {
    const suspended = { ...live, status: 'suspended' as const }
    renderApp('/organizacijas/1', {
      'GET /api/admin/charities/1': () => ok(suspended),
      'POST /api/admin/charities/1/restore': () => ok(live),
    })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Atjaunot' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Atjaunot' }))
    expect(await screen.findByText('Organizācija atjaunota.')).toBeInTheDocument()
  })

  it('resends the invite and reports a mail failure', async () => {
    renderApp('/organizacijas/1', {
      'GET /api/admin/charities/1': () => ok(live),
      'POST /api/admin/charities/1/resend-invite': () => ok({ mailSent: false }),
    })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Sūtīt uzaicinājumu vēlreiz' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('anna@ulubele.example')
    await user.click(within(dialog).getByRole('button', { name: 'Sūtīt uzaicinājumu vēlreiz' }))
    expect(await screen.findByText('Uzaicinājumu neizdevās nosūtīt.')).toBeInTheDocument()
  })

  it('deletes only after the name is typed exactly', async () => {
    const { calls } = renderApp('/organizacijas/1', {
      'GET /api/admin/charities/1': () => ok(live),
      'DELETE /api/admin/charities/1': () => ok({}),
      'GET /api/admin/charities': () => ok([]),
    })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Dzēst' }))
    const dialog = screen.getByRole('dialog', { name: 'Dzēst organizāciju' })
    const confirm = within(dialog).getByRole('button', { name: 'Dzēst' })
    expect(confirm).toBeDisabled()
    await user.type(within(dialog).getByRole('textbox'), 'Patversme')
    expect(within(dialog).getByText('Nosaukums nesakrīt.')).toBeInTheDocument()
    expect(confirm).toBeDisabled()
    await user.type(within(dialog).getByRole('textbox'), ' Ulubele')
    await user.click(confirm)
    expect(await screen.findByText('Organizācija dzēsta.')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Organizācijas' })).toBeInTheDocument()
    expect(calls.some((c) => c.method === 'DELETE')).toBe(true)
  })

  it('shows a not-found error', async () => {
    renderApp('/organizacijas/zz', { 'GET /api/admin/charities/zz': () => fail(404, 'not_found') })
    expect(await screen.findByRole('alert')).toHaveTextContent('Ieraksts netika atrasts')
  })

  it('links a pending update for review', async () => {
    renderApp('/organizacijas/1', {
      'GET /api/admin/charities/1': () => ok({ ...live, hasPendingUpdate: true, pendingUpdate: { profile: live.profile, submittedAt: '2026-11-20' } }),
    })
    expect(await screen.findByRole('link', { name: 'Skatīt izmaiņas' })).toHaveAttribute('href', '/izmainas/1')
    await waitFor(() => expect(screen.getByText(/neizskatītas izmaiņas/)).toBeInTheDocument())
  })
})
