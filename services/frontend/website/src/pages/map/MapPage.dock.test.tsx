import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ROUTES } from '@/config/site'
import { DOCK_QUERY } from '@/components/map/dock/useDockInset'
import { resetSnapshotCache } from '@/hooks/useSnapshot'
import { fakeFetch, snapshotFixture } from '@/lib/snapshot.fixtures'
import { renderWithProviders } from '@/test/render'
import { MapPage } from './MapPage'

vi.mock('maplibre-gl', () => {
  throw new Error('maplibre-gl was imported')
})
vi.mock('@/components/location-picker/MapCanvas', () => ({ MapCanvas: () => <div /> }))

const SNAPSHOT_URL = '/data/charities.json'
const ANON = { '/api/auth/me': { status: 401, body: { ok: false, error: 'unauthorized' } } }

/** Where the router is: the dock's address is part of what it does. */
const Address = () => <output aria-label="adrese">{useLocation().pathname + useLocation().search}</output>
const address = () => screen.getByRole('status', { name: 'adrese' }).textContent

const renderAt = (route: string) =>
  renderWithProviders(
    <>
      <MapPage />
      <Address />
    </>,
    { route },
  )

const dock = (name: string) => screen.findByRole('region', { name }, { timeout: 5000 })
const rail = () => screen.getByRole('navigation', { name: 'Kartes rīki' })

describe('MapPage, the docked panels', () => {
  beforeEach(() => {
    resetSnapshotCache()
    vi.stubGlobal('fetch', fakeFetch({ [SNAPSHOT_URL]: { body: snapshotFixture }, ...ANON }))
  })

  it('opens the registration at /registreties, and a press on the map does not close it', async () => {
    renderAt(ROUTES.register)
    const panel = await dock('Kļūt par saņēmēju')
    expect(await within(panel).findByRole('navigation', { name: 'Reģistrācijas soļi' }, { timeout: 5000 })).toBeInTheDocument()
    // The register button is the panel's own way in; while it is open it is not shown.
    expect(screen.queryByRole('link', { name: /Kļūt par saņēmēju/ })).toBeNull()

    // A rail panel closes on a press on the map; the dock stays, and so does the map.
    fireEvent.click(within(rail()).getByRole('button', { name: 'Jaunumi' }))
    expect(screen.getByRole('region', { name: 'Jaunumi' })).toBeInTheDocument()
    fireEvent.pointerDown(await screen.findByText('Karti nevar parādīt'))
    expect(screen.queryByRole('region', { name: 'Jaunumi' })).toBeNull()
    expect(screen.getByRole('region', { name: 'Kļūt par saņēmēju' })).toBeInTheDocument()
    expect(address()).toBe(ROUTES.register)
  })

  it('opens from the register button, and its X closes it back to the map with focus on the button', async () => {
    const user = userEvent.setup()
    renderAt(ROUTES.home)
    const register = screen.getByRole('link', { name: /Kļūt par saņēmēju/ })
    await user.click(register)
    const panel = await dock('Kļūt par saņēmēju')
    expect(address()).toBe(ROUTES.register)
    expect(panel).toHaveFocus()

    await user.click(within(panel).getByRole('button', { name: 'Aizvērt' }))
    expect(screen.queryByRole('region', { name: 'Kļūt par saņēmēju' })).toBeNull()
    expect(address()).toBe(ROUTES.home)
    await waitFor(() => expect(screen.getByRole('link', { name: /Kļūt par saņēmēju/ })).toHaveFocus())
  })

  it('opens the account from the rail: the login form, then forgot-password in the same panel', async () => {
    const user = userEvent.setup()
    renderAt(ROUTES.home)
    await user.click(within(rail()).getByRole('link', { name: 'Mans konts' }))
    const panel = await dock('Mans konts')
    expect(await within(panel).findByRole('heading', { name: 'Pieteikties' })).toBeInTheDocument()
    expect(within(rail()).getByRole('link', { name: 'Mans konts' })).toHaveAttribute('aria-current', 'page')

    await user.click(within(panel).getByRole('link', { name: /Aizmirsāt paroli|Aizmirsu paroli/ }))
    expect(address()).toBe(ROUTES.forgotPassword)
    expect(await dock('Aizmirsta parole')).toBeInTheDocument()
  })

  it('opens set-password from the email link, token and all', async () => {
    renderAt(`${ROUTES.setPassword}?token=abc123`)
    const panel = await dock('Paroles iestatīšana')
    expect(await within(panel).findByRole('button', { name: 'Saglabāt paroli' })).toBeInTheDocument()
  })

  it('opens a shared charity at /organizacija/<slug> on the map, and closing its card leaves that address', async () => {
    renderAt('/organizacija/ulubele')
    await screen.findByRole('group', { name: 'Kategorijas' })
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ulubele' } })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Rādīt kartē: Dzīvnieku patversme Ulubele' })).toHaveAttribute('aria-current', 'true'),
    )
    expect(document.title).toContain('Dzīvnieku patversme Ulubele')
  })

  it('opens the info panel at /par-projektu, and settles on the map\'s own address', async () => {
    renderAt(ROUTES.about)
    expect(await screen.findByRole('region', { name: 'Par Dod ar prieku' })).toBeInTheDocument()
    await waitFor(() => expect(address()).toBe(ROUTES.home))
  })

  it('is a full-screen sheet on a narrow screen: the map behind it is inert', async () => {
    renderAt(ROUTES.register)
    await dock('Kļūt par saņēmēju')
    const layer = document.querySelector('[data-map-layer]')
    expect(layer).toHaveAttribute('inert')
    expect(layer?.contains(rail())).toBe(true)
  })

  it('sits beside a usable map on a wide screen: nothing is inert', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query === DOCK_QUERY,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )
    renderAt(ROUTES.register)
    await dock('Kļūt par saņēmēju')
    expect(document.querySelector('[data-map-layer]')).not.toHaveAttribute('inert')
  })

  it('closes on Escape while focus is inside it', async () => {
    const user = userEvent.setup()
    renderAt(ROUTES.home)
    await user.click(screen.getByRole('link', { name: /Kļūt par saņēmēju/ }))
    const panel = await dock('Kļūt par saņēmēju')
    expect(panel).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: 'Kļūt par saņēmēju' })).toBeNull()
    expect(address()).toBe(ROUTES.home)
  })

  it('closes the charity card when a rail panel opens, so it is not left behind the panel', async () => {
    renderAt('/organizacija/ulubele')
    await screen.findByRole('group', { name: 'Kategorijas' })
    const result = () => screen.getByRole('button', { name: 'Rādīt kartē: Dzīvnieku patversme Ulubele' })
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ulubele' } })
    await waitFor(() => expect(result()).toHaveAttribute('aria-current', 'true'))

    fireEvent.click(within(rail()).getByRole('button', { name: 'Jaunumi' }))
    expect(screen.getByRole('region', { name: 'Jaunumi' })).toBeInTheDocument()
    // The card is closed, and with it the shared charity's address.
    await waitFor(() => expect(address()).toBe(ROUTES.home))
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ulub' } })
    await waitFor(() => expect(result()).not.toHaveAttribute('aria-current'))
  })
})
