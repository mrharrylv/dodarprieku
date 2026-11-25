import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { resetSnapshotCache } from '@/hooks/useSnapshot'
import { fakeFetch, snapshotFixture } from '@/lib/snapshot.fixtures'
import { renderWithProviders } from '@/test/render'
import { CharityPage } from './CharityPage'

const STATS = { views: 10, pledges: 3, pledgesByNeed: { smiltis: 2 }, recentSupporters: [{ name: 'Anna', at: '2026-11-20T10:00:00Z' }] }

const routes = (extra: Parameters<typeof fakeFetch>[0] = {}) =>
  fakeFetch({
    '/data/charities.json': { body: snapshotFixture },
    '/api/charities/c-ulubele/stats': { body: { ok: true, data: STATS } },
    '/api/charities/c-ulubele/view': { body: { ok: true, data: {} } },
    '/api/charities/c-ulubele/pledges': { body: { ok: true, data: { id: 'p1' } } },
    '/api/subscribe': { body: { ok: true, data: {} } },
    ...extra,
  })

const renderAt = (path: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/organizacija" element={<CharityPage />} />
      <Route path="/organizacija/:slug" element={<CharityPage />} />
    </Routes>,
    { route: path },
  )

describe('CharityPage', () => {
  beforeEach(() => {
    resetSnapshotCache()
    window.sessionStorage.clear()
  })

  it('starts as the loading shell with one h1', () => {
    vi.stubGlobal('fetch', routes())
    renderAt('/organizacija/ulubele')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Organizācija')
  })

  it('shows the charity: header, contacts, needs with counts, delivery, sponsors, supporters', async () => {
    vi.stubGlobal('fetch', routes())
    renderAt('/organizacija/ulubele')
    expect(await screen.findByRole('heading', { level: 1, name: 'Dzīvnieku patversme Ulubele' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('link', { name: /Rādīt kartē/ })).toHaveAttribute('href', '/?org=ulubele')
    expect(screen.getByRole('link', { name: 'info@ulubele.test' })).toHaveAttribute('href', 'mailto:info@ulubele.test')
    expect(screen.getByRole('link', { name: /^ulubele\.test/ })).toHaveAttribute('href', 'https://ulubele.test/')
    // A javascript: link in the data never becomes an href.
    expect(screen.queryByText('Facebook')).not.toBeInTheDocument()
    expect(screen.getByText('tikai bez graudiem')).toBeInTheDocument()
    expect(await screen.findByText('Apsolīts: 2')).toBeInTheDocument()
    expect(screen.getByText('Anna')).toBeInTheDocument()
    expect(screen.getByText('Omniva Rimi Ulubele')).toBeInTheDocument()
    expect(screen.getByText('Darba laiks: 10:00-18:00')).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: 'SIA Labie logotips' })).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Atvērt attēlu 1 no 2' })).toBeInTheDocument()
  })

  it('counts the view once per tab', async () => {
    const fetcher = routes()
    vi.stubGlobal('fetch', fetcher)
    const viewCalls = () => fetcher.mock.calls.filter(([url]) => String(url).endsWith('/view')).length
    const first = renderAt('/organizacija/ulubele')
    await screen.findByRole('heading', { level: 1, name: 'Dzīvnieku patversme Ulubele' })
    await waitFor(() => expect(viewCalls()).toBe(1))
    first.unmount()
    renderAt('/organizacija/ulubele')
    await screen.findByRole('heading', { level: 1, name: 'Dzīvnieku patversme Ulubele' })
    expect(viewCalls()).toBe(1)
  })

  it('is a not-found page for an unknown slug and for the bare shell', async () => {
    vi.stubGlobal('fetch', routes())
    renderAt('/organizacija/nav-tadas')
    expect(await screen.findByRole('heading', { level: 1, name: 'Šāda organizācija nav atrasta' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Atpakaļ uz karti' })).toHaveAttribute('href', '/')
  })

  it('shows a load error with a retry', async () => {
    vi.stubGlobal('fetch', fakeFetch({ '/data/charities.json': { status: 500, body: { ok: false, error: 'server' } } }))
    renderAt('/organizacija/ulubele')
    expect(await screen.findByRole('heading', { level: 1, name: 'Neizdevās ielādēt organizācijas lapu' })).toBeInTheDocument()
    expect(screen.getByText(/Mūsu pusē radās kļūda/)).toHaveTextContent('info@hagroup.lv')
    vi.stubGlobal('fetch', routes())
    fireEvent.click(screen.getByRole('button', { name: 'Mēģināt vēlreiz' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Dzīvnieku patversme Ulubele' })).toBeInTheDocument()
  })

  it('says when the pledge counts did not load, and retries', async () => {
    vi.stubGlobal('fetch', routes({ '/api/charities/c-ulubele/stats': { status: 500, body: {} } }))
    renderAt('/organizacija/ulubele')
    expect(await screen.findByText('Neizdevās ielādēt apsolījumu skaitu.')).toBeInTheDocument()
    vi.stubGlobal('fetch', routes())
    fireEvent.click(screen.getByRole('button', { name: 'Mēģināt vēlreiz' }))
    expect(await screen.findByText('Apsolīts: 2')).toBeInTheDocument()
  })

  it('runs the whole "Es ziedošu" flow: tick, dialog, validation, thanks, subscribe offer', async () => {
    const fetcher = routes()
    vi.stubGlobal('fetch', fetcher)
    renderAt('/organizacija/ulubele')
    await screen.findByRole('heading', { level: 1, name: 'Dzīvnieku patversme Ulubele' })

    fireEvent.click(screen.getByRole('button', { name: /Es ziedošu/ }))
    expect(screen.getByText('Vispirms atzīmējiet vismaz vienu lietu sarakstā.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('checkbox', { name: /Kaķu pakaiši/ }))
    expect(screen.getByText('Atzīmēts: 1')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Es ziedošu/ }))

    const dialog = screen.getByRole('dialog', { name: 'Es ziedošu' })
    const form = within(dialog)
    fireEvent.click(form.getByRole('radio', { name: 'Ar vārdu' }))
    fireEvent.click(form.getByRole('button', { name: 'Apstiprināt' }))
    expect(form.getByText('Ierakstiet vārdu vai izvēlieties „Anonīmi”.')).toBeInTheDocument()

    fireEvent.change(form.getByLabelText(/Vārds vai uzņēmuma nosaukums/), { target: { value: 'Jānis' } })
    fireEvent.change(form.getByLabelText(/E-pasts/), { target: { value: 'janis@example.lv' } })
    fireEvent.click(form.getByRole('button', { name: 'Apstiprināt' }))
    expect(form.getByText('Lai mēs varētu jums rakstīt, apstipriniet piekrišanu.')).toBeInTheDocument()

    fireEvent.click(form.getByRole('checkbox', { name: /Piekrītu, ka Dodar prieku/ }))
    fireEvent.click(form.getByRole('button', { name: 'Apstiprināt' }))

    expect(await form.findByText('Paldies!')).toBeInTheDocument()
    expect(form.getByText('Pateicību nosūtīsim uz janis@example.lv.')).toBeInTheDocument()
    const sent = fetcher.mock.calls.find(([url]) => String(url).endsWith('/pledges'))
    expect(JSON.parse(String(sent?.[1]?.body))).toEqual({
      needs: ['smiltis'],
      anonymous: false,
      name: 'Jānis',
      email: 'janis@example.lv',
      subscribe: false,
      consent: true,
    })

    // Not subscribed yet: offered, with the email filled in.
    expect(form.getByText('Vai vēlaties uzzināt, kad kaut kas būs ļoti vajadzīgs?')).toBeInTheDocument()
    expect(form.getByLabelText(/^E-pasts/)).toHaveValue('janis@example.lv')
    fireEvent.click(form.getByRole('button', { name: 'Atpakaļ uz organizācijas lapu' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
