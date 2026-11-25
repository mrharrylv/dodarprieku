import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ListRequestRecord, PledgeRecord, SubscriberRecord } from '@shared/contracts'
import * as csv from '../lib/csv'
import { fail, ok } from '../test/fetch'
import { summary } from '../test/fixtures'
import { renderApp } from '../test/render'

const charities = [summary({ id: 'c1', name: 'Ulubele' }), summary({ id: 'c2', name: 'Bērnu nams', status: 'pending' })]
const subscribers: SubscriberRecord[] = [
  { email: 'janis@a.lv', name: 'Jānis', charityIds: ['c1'], createdAt: '2026-11-02T00:00:00Z' },
  { email: 'ilze@b.lv', charityIds: [], createdAt: '2026-11-03T00:00:00Z' },
]
const pledges: PledgeRecord[] = [
  { id: 'p1', charityId: 'c1', needs: ['sausa-bariba-suniem', 'custom:1'], anonymous: false, name: 'Pēteris', email: 'p@x.lv', message: 'Atvedīšu sestdien', createdAt: new Date().toISOString() },
  { id: 'p2', charityId: 'c1', needs: ['segas'], anonymous: true, createdAt: '2026-01-01T00:00:00Z' },
]
const requests: ListRequestRecord[] = [
  { id: 'r1', charityId: 'c1', charityName: 'Ulubele', message: 'Lūdzu sarakstu', status: 'open', createdAt: '2026-11-20T00:00:00Z' },
  { id: 'r0', charityId: 'c2', charityName: 'Bērnu nams', status: 'done', createdAt: '2026-10-01T00:00:00Z' },
]

describe('dashboard', () => {
  it('shows every count', async () => {
    renderApp('/', {
      'GET /api/admin/charities': () => ok(charities),
      'GET /api/admin/subscribers': () => ok(subscribers),
      'GET /api/admin/pledges': () => ok(pledges),
      'GET /api/admin/list-requests': () => ok(requests),
    })
    const tile = async (label: string) => (await within(await screen.findByRole('main')).findByText(label)).closest('a')!
    expect(await tile('Jauni pieteikumi')).toHaveTextContent('1')
    expect(await tile('Abonenti')).toHaveTextContent('2')
    expect(await tile('Ziedojumu solījumi 30 dienās')).toHaveTextContent('1')
    expect(await tile('Atvērti saraksta pieprasījumi')).toHaveTextContent('1')
    expect(await tile('Apstiprinātas organizācijas')).toHaveAttribute('href', '/organizacijas')
  })
})

describe('subscribers', () => {
  it('lists, searches and exports a CSV of what is shown', async () => {
    const download = vi.spyOn(csv, 'downloadCsv').mockImplementation(() => undefined)
    renderApp('/abonenti', {
      'GET /api/admin/charities': () => ok(charities),
      'GET /api/admin/subscribers': () => ok(subscribers),
    })
    const user = userEvent.setup()
    expect(await screen.findByText('janis@a.lv')).toBeInTheDocument()
    expect(screen.getByText('Vispārīgi')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Meklēt pēc e-pasta vai vārda'), 'janis')
    expect(screen.queryByText('ilze@b.lv')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Eksportēt CSV' }))
    expect(download).toHaveBeenCalledTimes(1)
    const [filename, body] = download.mock.calls[0]!
    expect(filename).toMatch(/^abonenti-\d{4}-\d{2}-\d{2}\.csv$/)
    expect(body).toBe('E-pasts,Vārds,Organizācijas,Pieteicās\r\njanis@a.lv,Jānis,Ulubele,2026-11-02T00:00:00Z\r\n')
    expect(await screen.findByText('CSV fails sagatavots.')).toBeInTheDocument()
  })
})

describe('pledges', () => {
  it('shows pledges with emails and filters by organisation', async () => {
    const { calls } = renderApp('/ziedojumi', {
      'GET /api/admin/charities': () => ok(charities),
      'GET /api/admin/pledges': () => ok(pledges),
      'GET /api/admin/pledges?charityId=c2': () => ok([]),
    })
    const user = userEvent.setup()
    expect(await screen.findByText('p@x.lv')).toBeInTheDocument()
    expect(screen.getByText('Sausā barība suņiem, Cita vajadzība')).toBeInTheDocument()
    expect(screen.getByText('Anonīmi')).toBeInTheDocument()
    await screen.findByRole('option', { name: 'Bērnu nams' })
    await user.selectOptions(screen.getByLabelText('Organizācija'), 'c2')
    expect(await screen.findByText('Ziedojumu solījumu nav.')).toBeInTheDocument()
    expect(calls.some((c) => c.url === '/api/admin/pledges?charityId=c2')).toBe(true)
  })
})

describe('list requests', () => {
  it('marks a request done and exports that organisation\'s subscribers', async () => {
    const download = vi.spyOn(csv, 'downloadCsv').mockImplementation(() => undefined)
    renderApp('/pieprasijumi', {
      'GET /api/admin/list-requests': () => ok(requests),
      'GET /api/admin/subscribers': () => ok(subscribers),
      'POST /api/admin/list-requests/c1/r1/done': () => ok({ ...requests[0], status: 'done' }),
    })
    const user = userEvent.setup()
    expect(await screen.findByText('Lūdzu sarakstu')).toBeInTheDocument()
    expect(screen.queryByText('Bērnu nams')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Lejupielādēt abonentu CSV' }))
    expect(await screen.findByText('CSV ar 1 abonentiem sagatavots.')).toBeInTheDocument()
    expect(download.mock.calls[0]?.[0]).toMatch(/^abonenti-ulubele-/)
    await user.click(screen.getByRole('button', { name: 'Atzīmēt kā izpildītu' }))
    expect(await screen.findByText('Pieprasījums atzīmēts kā izpildīts.')).toBeInTheDocument()
    expect(screen.getByText('Pieprasījumu nav.')).toBeInTheDocument()
    await user.click(screen.getByLabelText('Rādīt arī izpildītos'))
    expect(screen.getAllByText('Izpildīts')).toHaveLength(2)
  })

  it('says when there is nothing to export, and shows a failed mark', async () => {
    renderApp('/pieprasijumi', {
      'GET /api/admin/list-requests': () => ok([{ ...requests[0], charityId: 'c9' }]),
      'GET /api/admin/subscribers': () => ok(subscribers),
      'POST /api/admin/list-requests/c9/r1/done': () => fail(500, 'server'),
    })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Lejupielādēt abonentu CSV' }))
    expect(await screen.findByText('Šai organizācijai vēl nav abonentu.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Atzīmēt kā izpildītu' }))
    const alert = await screen.findByText(/Servera kļūda/)
    expect(within(alert.closest('[role="alert"]')!).getByText(/Servera kļūda/)).toBeInTheDocument()
  })
})

describe('shell', () => {
  it('toggles the theme and shows a not-found page', async () => {
    renderApp('/nav-tadas')
    const user = userEvent.setup()
    expect(await screen.findByText('Šī lapa netika atrasta.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tumšais režīms' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    await user.click(screen.getByRole('button', { name: 'Gaišais režīms' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    await user.click(screen.getByRole('button', { name: 'Izvēlne' }))
    expect(screen.getByRole('button', { name: 'Izvēlne' })).toHaveAttribute('aria-expanded', 'true')
  })
})
