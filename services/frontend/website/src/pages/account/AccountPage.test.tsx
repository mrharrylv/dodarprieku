import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ACCOUNT, VALID_PROFILE } from '@/components/profile-editor/fixtures'
import { fail, mockApi, ok, type Reply } from '@/components/profile-editor/fetch-mock'
import { renderWithProviders } from '@/test/render'
import { AccountPage } from './AccountPage'
import { formatNumber } from './format'

vi.mock('@/components/location-picker/MapCanvas', () => ({ MapCanvas: () => <div /> }))

const ME = { email: 'anna@ulubele.lv', role: 'charity', charityId: 'c1' }
const PLEDGES = [
  { id: 'p1', charityId: 'c1', needs: ['sausa-bariba-suniem', 'custom:1'], anonymous: false, name: 'Jānis', message: 'Atnesīšu sestdien', createdAt: '2026-11-20T10:00:00Z' },
  { id: 'p2', charityId: 'c1', needs: ['sausa-bariba-suniem'], anonymous: true, createdAt: '2026-11-21T10:00:00Z' },
]

const loggedIn = (account = ACCOUNT, extra: Record<string, Reply | ((b: unknown) => Reply)> = {}) =>
  mockApi({
    'GET /api/auth/me': ok(ME),
    'GET /api/account': ok(account),
    'GET /api/account/pledges': ok(PLEDGES),
    ...extra,
  })

describe('AccountPage, logged out', () => {
  it('shows the login form and logs in', async () => {
    let session = false
    mockApi({
      'GET /api/auth/me': () => (session ? ok(ME) : fail(401, 'unauthorized')),
      'POST /api/auth/login': (body) => {
        session = (body as { password: string }).password === 'pareiza-parole'
        return session ? ok(ME) : fail(401, 'unauthorized')
      },
      'GET /api/account': ok(ACCOUNT),
      'GET /api/account/pledges': ok([]),
    })
    renderWithProviders(<AccountPage />)
    expect(await screen.findByRole('heading', { name: 'Pieteikties' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Pieteikties' }))
    expect(screen.getByText('Ierakstiet e-pastu.')).toBeInTheDocument()
    expect(screen.getByText('Ierakstiet paroli.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/^E-pasts/), { target: { value: 'anna@ulubele.lv' } })
    fireEvent.change(screen.getByLabelText(/^Parole/), { target: { value: 'nepareiza' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pieteikties' }))
    expect(await screen.findByText('Nepareizs e-pasts vai parole')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/^Parole/), { target: { value: 'pareiza-parole' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pieteikties' }))
    expect(await screen.findByRole('heading', { name: 'Patversme Ulubele' })).toBeInTheDocument()
  })

  it.each([
    [fail(429, 'rate_limited'), 'Pārāk daudz mēģinājumu'],
    ['network' as const, 'Nav savienojuma ar serveri'],
    [fail(500, 'server'), 'Serverī radās kļūda'],
    [fail(400, 'validation'), 'Nepareizs e-pasts vai parole'],
  ])('shows its own copy for a failed login (%j)', async (reply, title) => {
    mockApi({ 'GET /api/auth/me': fail(401, 'unauthorized'), 'POST /api/auth/login': reply })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    renderWithProviders(<AccountPage />)
    fireEvent.change(await screen.findByLabelText(/^E-pasts/), { target: { value: 'a@b.lv' } })
    fireEvent.change(screen.getByLabelText(/^Parole/), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pieteikties' }))
    expect(await screen.findByText(title)).toBeInTheDocument()
  })

  it('offers a retry when the session check fails', async () => {
    let calls = 0
    mockApi({ 'GET /api/auth/me': () => (calls++ === 0 ? fail(503, 'server') : fail(401, 'unauthorized')) })
    renderWithProviders(<AccountPage />)
    expect(await screen.findByText('Kontu neizdevās ielādēt')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mēģināt vēlreiz' }))
    expect(await screen.findByRole('heading', { name: 'Pieteikties' })).toBeInTheDocument()
  })

  it('tells an admin this is not their account page', async () => {
    mockApi({ 'GET /api/auth/me': ok({ email: 'admin@hagroup.lv', role: 'admin' }), 'POST /api/auth/logout': ok({}) })
    renderWithProviders(<AccountPage />)
    expect(await screen.findByText('Šis nav organizācijas konts')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Iziet' }))
    expect(await screen.findByRole('heading', { name: 'Pieteikties' })).toBeInTheDocument()
  })
})

describe('AccountPage, logged in', () => {
  it('shows status, numbers, per-need counts and the pledges', async () => {
    loggedIn()
    renderWithProviders(<AccountPage />)
    expect(await screen.findByText('Jūsu lapa ir publicēta')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Skatīt publisko lapu' })).toHaveAttribute('href', '/organizacija/patversme-ulubele')
    const stats = screen.getByRole('region', { name: 'Skaitļi' })
    expect(within(stats).getByText(formatNumber(1234), { normalizer: (s) => s })).toBeInTheDocument()
    expect(within(stats).getByText('Skatījumi')).toBeInTheDocument()
    expect(within(stats).getByText('5 atzīmes')).toBeInTheDocument()
    expect(within(stats).getByText('Veļas mašīna')).toBeInTheDocument()

    const pledges = screen.getByRole('region', { name: 'Ziedotāju atzīmes' })
    expect(await within(pledges).findByText('Jānis')).toBeInTheDocument()
    expect(within(pledges).getByText('Anonīms')).toBeInTheDocument()
    expect(within(pledges).getByText('Atnesīšu sestdien')).toBeInTheDocument()
    expect(within(pledges).getByText(/Sausā barība suņiem, Veļas mašīna/)).toBeInTheDocument()
  })

  it.each([
    ['pending', 'Pieteikums gaida apstiprinājumu'],
    ['suspended', 'Lapa ir paslēpta no kartes'],
    ['rejected', 'Pieteikums nav apstiprināts'],
  ] as const)('explains the %s status, with no public link', async (status, title) => {
    loggedIn({ ...ACCOUNT, status })
    renderWithProviders(<AccountPage />)
    expect(await screen.findByText(title)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Skatīt publisko lapu' })).not.toBeInTheDocument()
  })

  it('says a change is waiting, and opens the editor on it', async () => {
    const proposed = { ...VALID_PROFILE, organization: { ...VALID_PROFILE.organization, name: 'Ulubele (jaunais)' } }
    loggedIn({ ...ACCOUNT, pendingUpdate: { profile: proposed, submittedAt: '2026-11-24T08:00:00Z' } })
    renderWithProviders(<AccountPage />)
    expect(await screen.findByText('Izmaiņas gaida administratora apstiprinājumu')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Nosaukums, kā to redzēs/)).toHaveValue('Ulubele (jaunais)')
  })

  it('submits profile changes and reports that they await approval', async () => {
    const api = loggedIn(ACCOUNT, {
      'PUT /api/account/profile': (body) => ok({ ...ACCOUNT, pendingUpdate: { profile: body, submittedAt: '2026-11-25T08:00:00Z' } }),
    })
    renderWithProviders(<AccountPage />)
    fireEvent.change(await screen.findByLabelText(/^Juridiskais nosaukums/), { target: { value: 'Biedrība "Ulubele" (jauns)' } })
    fireEvent.click(screen.getByRole('tab', { name: 'Atbalstītāji' }))
    expect(screen.getByRole('tab', { name: 'Atbalstītāji' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.change(screen.getByLabelText(/^Nosaukums/), { target: { value: 'SIA Labākie' } })
    fireEvent.click(screen.getByRole('button', { name: 'Iesniegt izmaiņas' }))
    expect(await screen.findByText('Izmaiņas iesniegtas')).toBeInTheDocument()
    expect(screen.getByText('Izmaiņas gaida administratora apstiprinājumu')).toBeInTheDocument()
    const put = api.mock.calls.find(([, init]) => init?.method === 'PUT')
    expect(JSON.parse(String(put?.[1]?.body))).toMatchObject({
      organization: { legalName: 'Biedrība "Ulubele" (jauns)' },
      sponsors: [{ name: 'SIA Labākie', url: 'https://labie.lv' }],
    })
  })

  it('jumps to the tab with a problem and focuses it', async () => {
    const api = loggedIn()
    renderWithProviders(<AccountPage />)
    fireEvent.click(await screen.findByRole('tab', { name: 'Atrašanās vieta' }))
    fireEvent.change(screen.getByLabelText(/^Pilsēta vai pagasts/), { target: { value: '' } })
    fireEvent.click(screen.getByRole('tab', { name: 'Organizācija' }))
    fireEvent.click(screen.getByRole('button', { name: 'Iesniegt izmaiņas' }))
    expect(await screen.findByText('Daži lauki jāizlabo')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Atrašanās vieta/ })).toHaveAttribute('aria-selected', 'true')
    await waitFor(() => expect(screen.getByLabelText(/^Pilsēta vai pagasts/)).toHaveFocus())
    expect(api.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false)
  })

  it('moves between tabs with the arrow keys', async () => {
    loggedIn()
    renderWithProviders(<AccountPage />)
    const first = await screen.findByRole('tab', { name: 'Organizācija' })
    fireEvent.keyDown(first, { key: 'ArrowLeft' })
    expect(screen.getByRole('tab', { name: 'Atbalstītāji' })).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Atbalstītāji' }), { key: 'Home' })
    expect(first).toHaveFocus()
    fireEvent.keyDown(first, { key: 'End' })
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Atbalstītāji' }), { key: 'ArrowRight' })
    expect(first).toHaveAttribute('aria-selected', 'true')
  })

  it.each([
    [fail(500, 'server'), 'Izmaiņas nav saglabātas'],
    [fail(401, 'unauthorized'), 'Sesija ir beigusies'],
    [fail(400, 'validation', { 'organization.regNumber': 'invalid' }), 'Serveris nepieņēma dažus laukus'],
  ])('reports a failed save (%j)', async (reply, text) => {
    loggedIn(ACCOUNT, { 'PUT /api/account/profile': reply })
    renderWithProviders(<AccountPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Iesniegt izmaiņas' }))
    expect(await screen.findByText(new RegExp(text))).toBeInTheDocument()
  })

  it('requests the subscriber list and shows when', async () => {
    const api = loggedIn(ACCOUNT, {
      'POST /api/account/list-request': ok({ id: 'r1', charityId: 'c1', charityName: 'x', status: 'open', createdAt: '2026-11-25T09:30:00Z' }),
    })
    renderWithProviders(<AccountPage />)
    expect(await screen.findByText('Sarakstu vēl neesat pieprasījuši.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/^Ziņa administratoram/), { target: { value: 'Paldies!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pieprasīt abonentu sarakstu' }))
    expect(await screen.findByText('Pieprasījums nosūtīts')).toBeInTheDocument()
    expect(screen.getByText(/^Pēdējais pieprasījums: .*2026/)).toBeInTheDocument()
    const post = api.mock.calls.find(([url]) => url === '/api/account/list-request')
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ message: 'Paldies!' })
  })

  it('reports a failed list request', async () => {
    loggedIn(ACCOUNT, { 'POST /api/account/list-request': fail(429, 'rate_limited') })
    renderWithProviders(<AccountPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Pieprasīt abonentu sarakstu' }))
    expect(await screen.findByText('Pieprasījums nav nosūtīts.')).toBeInTheDocument()
  })

  it('retries the pledge list after a failure', async () => {
    let calls = 0
    loggedIn(ACCOUNT, { 'GET /api/account/pledges': () => (calls++ === 0 ? fail(500, 'server') : ok([])) })
    renderWithProviders(<AccountPage />)
    const pledges = await screen.findByRole('region', { name: 'Ziedotāju atzīmes' })
    fireEvent.click(await within(pledges).findByRole('button', { name: 'Mēģināt vēlreiz' }))
    expect(await within(pledges).findByText(/Vēl neviens nav atzīmējis/)).toBeInTheDocument()
  })

  it('logs out, and keeps the session when logout fails', async () => {
    let calls = 0
    loggedIn(ACCOUNT, { 'POST /api/auth/logout': () => (calls++ === 0 ? 'network' : ok({})) })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    renderWithProviders(<AccountPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Iziet' }))
    expect(await screen.findByText('Neizdevās iziet no konta')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Iziet' }))
    expect(await screen.findByRole('heading', { name: 'Pieteikties' })).toBeInTheDocument()
  })
})
