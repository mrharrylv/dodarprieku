import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { fail, ok } from '../test/fetch'
import { detail, summary } from '../test/fixtures'
import { renderApp } from '../test/render'

const pendingDetail = detail({ id: 'p1', status: 'pending', name: 'Patversme Ulubele', passwordSet: false })

describe('applications', () => {
  it('lists pending applications newest first, with a badge in the sidebar', async () => {
    const pending = [
      summary({ id: 'old', name: 'Vecais', status: 'pending', createdAt: '2026-11-01T00:00:00Z' }),
      summary({ id: 'new', name: 'Jaunais', status: 'pending', createdAt: '2026-11-20T00:00:00Z' }),
    ]
    renderApp('/pieteikumi', {
      'GET /api/admin/charities?status=pending': () => ok(pending),
      'GET /api/admin/charities': () => ok([...pending, summary({ id: 'a' })]),
    })
    const links = await screen.findAllByRole('link', { name: /Vecais|Jaunais/ })
    expect(links.map((l) => l.textContent)).toEqual([expect.stringContaining('Jaunais'), expect.stringContaining('Vecais')])
    const nav = screen.getByRole('navigation', { name: 'Izvēlne' })
    await waitFor(() => expect(within(nav).getByRole('link', { name: /Pieteikumi/ })).toHaveTextContent('2'))
  })

  it('shows an empty state and a retryable error', async () => {
    let failing = true
    renderApp('/pieteikumi', {
      'GET /api/admin/charities?status=pending': () => (failing ? fail(500, 'server') : ok([])),
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('Servera kļūda')
    failing = false
    await userEvent.setup().click(screen.getByRole('button', { name: 'Mēģināt vēlreiz' }))
    expect(await screen.findByText('Jaunu pieteikumu nav.')).toBeInTheDocument()
  })

  it('presents every part of the application', async () => {
    renderApp('/pieteikumi/p1', { 'GET /api/admin/charities/p1': () => ok(pendingDetail) })
    expect(await screen.findByRole('heading', { name: 'Patversme Ulubele', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Biedrība "Ulubele"')).toBeInTheDocument()
    expect(screen.getByText('anna@ulubele.example')).toBeInTheDocument()
    expect(screen.getByTestId('map-pin')).toHaveTextContent('57.07,24.32')
    expect(screen.getByText('Sausā barība suņiem')).toBeInTheDocument()
    expect(screen.getByText('Lielo šķirņu')).toBeInTheDocument()
    expect(screen.getByText('Kaķu mājiņas')).toBeInTheDocument()
    expect(screen.getAllByText('Steidzami').length).toBeGreaterThan(0)
    expect(screen.getByText(/Ādažu Maxima/)).toBeInTheDocument()
    expect(screen.getByText('SIA Barība')).toBeInTheDocument()
    expect(screen.getByAltText('Patversme Ulubele, foto 1')).toHaveAttribute('src', '/media/uploads/2026/11/photo-aaaa1111.webp')
    expect(screen.getByAltText('Patversme Ulubele logo')).toBeInTheDocument()
  })

  it('approves after confirmation and reports the email result', async () => {
    const { calls } = renderApp('/pieteikumi/p1', {
      'GET /api/admin/charities/p1': () => ok(pendingDetail),
      'POST /api/admin/charities/p1/approve': () => ok({ ...pendingDetail, status: 'approved', mailSent: true }),
      'GET /api/admin/charities?status=pending': () => ok([]),
    })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Apstiprināt' }))
    const dialog = screen.getByRole('dialog', { name: 'Apstiprināt pieteikumu?' })
    expect(dialog).toHaveTextContent('anna@ulubele.example')
    await user.click(within(dialog).getByRole('button', { name: 'Apstiprināt' }))
    expect(await screen.findByText('Pieteikums apstiprināts.')).toBeInTheDocument()
    expect(screen.getByText('E-pasts ar paroles saiti nosūtīts.')).toBeInTheDocument()
    expect(await screen.findByText('Jaunu pieteikumu nav.')).toBeInTheDocument()
    expect(calls.filter((c) => c.method === 'POST').map((c) => c.url)).toEqual(['/api/admin/charities/p1/approve'])
  })

  it('warns when the approval email did not go out', async () => {
    renderApp('/pieteikumi/p1', {
      'GET /api/admin/charities/p1': () => ok(pendingDetail),
      'POST /api/admin/charities/p1/approve': () => ok({ ...pendingDetail, status: 'approved', mailSent: false }),
    })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Apstiprināt' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Apstiprināt' }))
    expect(await screen.findByText(/E-pastu neizdevās nosūtīt/)).toBeInTheDocument()
  })

  it('keeps the dialog open with the error when approval fails', async () => {
    renderApp('/pieteikumi/p1', {
      'GET /api/admin/charities/p1': () => ok(pendingDetail),
      'POST /api/admin/charities/p1/approve': () => fail(409, 'conflict'),
    })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Apstiprināt' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Apstiprināt' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('kāds pa to laiku ir mainījis')
  })

  it('rejects only with a reason, and sends it', async () => {
    const { calls } = renderApp('/pieteikumi/p1', {
      'GET /api/admin/charities/p1': () => ok(pendingDetail),
      'POST /api/admin/charities/p1/reject': () => ok({ ...pendingDetail, status: 'rejected' }),
      'GET /api/admin/charities?status=pending': () => ok([]),
    })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Noraidīt' }))
    const dialog = screen.getByRole('dialog', { name: 'Noraidīt pieteikumu' })
    await user.click(within(dialog).getByRole('button', { name: 'Noraidīt' }))
    expect(within(dialog).getByText('Ierakstiet iemeslu.')).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText('Iemesls'), 'Trūkst reģistrācijas apliecības')
    await user.click(within(dialog).getByRole('button', { name: 'Noraidīt' }))
    expect(await screen.findByText('Pieteikums noraidīts.')).toBeInTheDocument()
    expect(calls.find((c) => c.url.endsWith('/reject'))?.body).toEqual({ reason: 'Trūkst reģistrācijas apliecības' })
  })

  it('closes a dialog with Escape and returns focus', async () => {
    renderApp('/pieteikumi/p1', { 'GET /api/admin/charities/p1': () => ok(pendingDetail) })
    const user = userEvent.setup()
    const trigger = await screen.findByRole('button', { name: 'Apstiprināt' })
    await user.click(trigger)
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('button', { name: 'Apstiprināt' })).toHaveFocus()
    await user.tab()
    await user.tab()
    expect(dialog.contains(document.activeElement)).toBe(true)
    await user.tab({ shift: true })
    await user.tab({ shift: true })
    await user.tab({ shift: true })
    expect(dialog.contains(document.activeElement)).toBe(true)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(trigger).toHaveFocus()
  })

  it('opens the editor from an application', async () => {
    renderApp('/pieteikumi/p1', { 'GET /api/admin/charities/p1': () => ok(pendingDetail) })
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Rediģēt' }))
    expect(await screen.findByText(/Administratora labojumi tiek publicēti uzreiz/)).toBeInTheDocument()
  })
})
