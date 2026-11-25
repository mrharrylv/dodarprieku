import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import i18n from '@/i18n'
import { ROUTES } from '@/config/site'
import { resetSnapshotCache } from '@/hooks/useSnapshot'
import { fakeFetch, snapshotFixture } from '@/lib/snapshot.fixtures'
import { renderWithProviders } from '@/test/render'
import { MapPage } from './MapPage'

// The library must never be needed for the page's shell; importing it fails the test.
vi.mock('maplibre-gl', () => {
  throw new Error('maplibre-gl was imported')
})

const SNAPSHOT_URL = '/data/charities.json'
const rail = () => screen.getByRole('navigation', { name: 'Kartes rīki' })
const railButton = (name: string) => within(rail()).getByRole('button', { name })

describe('MapPage', () => {
  beforeEach(() => resetSnapshotCache())

  it('prerenders its chrome (h1, search, rail, register button) with every panel closed, without fetching or the map', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const html = renderToString(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <MapPage />
        </MemoryRouter>
      </I18nextProvider>,
    )
    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toContain('Labdarības karte')
    expect(html).toContain('Atrodiet iestādi sev tuvumā')
    expect(html).toContain('type="search"')
    expect(html).toContain('Kartes rīki')
    expect(html).toContain('href="/registreties"')
    // The info button opens a panel; nothing on the map links to the project page any more.
    expect(html).not.toContain(`href="${ROUTES.about}"`)
    expect(html).not.toContain('id="map-panel-')
    expect(html).not.toContain('aria-expanded="true"')
    expect(html).not.toContain('maplibregl')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('loads the snapshot, filters with the chips and the search, and flies to a charity from the list', async () => {
    vi.stubGlobal('fetch', fakeFetch({ [SNAPSHOT_URL]: { body: snapshotFixture } }))
    renderWithProviders(<MapPage />)
    expect(await screen.findByText('Karti nevar parādīt')).toBeInTheDocument()
    const chips = await screen.findByRole('group', { name: 'Kategorijas' })
    expect(within(chips).getByRole('button', { name: /Visas/ })).toHaveTextContent('2')

    fireEvent.click(railButton('Organizācijas'))
    const panel = screen.getByRole('region', { name: 'Organizācijas' })
    expect(within(panel).getByText('2 organizācijas')).toBeInTheDocument()

    fireEvent.click(within(chips).getByRole('button', { name: /Bērnu nami/ }))
    expect(within(panel).getByText('1 organizācija')).toBeInTheDocument()
    fireEvent.click(within(chips).getByRole('button', { name: /Visas/ }))

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ulubele' } })
    expect(within(panel).getByText('1 organizācija')).toBeInTheDocument()
    fireEvent.click(within(panel).getByRole('button', { name: 'Rādīt kartē: Dzīvnieku patversme Ulubele' }))
    expect(within(panel).getByRole('button', { name: 'Rādīt kartē: Dzīvnieku patversme Ulubele' })).toHaveAttribute('aria-current', 'true')

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'nekas' } })
    expect(within(panel).getByText('Neviena organizācija neatbilst meklējumam.')).toBeInTheDocument()
    fireEvent.click(within(panel).getByRole('button', { name: 'Rādīt visas' }))
    expect(within(panel).getByText('2 organizācijas')).toBeInTheDocument()
  })

  it('opens one panel at a time, moves focus into it, and returns focus on Escape and on close', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', fakeFetch({ [SNAPSHOT_URL]: { body: snapshotFixture } }))
    renderWithProviders(<MapPage />)
    await screen.findByRole('group', { name: 'Kategorijas' })

    const list = railButton('Organizācijas')
    const board = railButton('Lielākie atbalstītāji')
    expect(list).toHaveAttribute('aria-expanded', 'false')
    expect(list).not.toHaveAttribute('aria-controls')

    await user.click(list)
    const listPanel = screen.getByRole('region', { name: 'Organizācijas' })
    expect(listPanel).toHaveAttribute('id', 'map-panel-list')
    expect(list).toHaveAttribute('aria-controls', 'map-panel-list')
    expect(listPanel).toHaveFocus()
    expect(list).toHaveAttribute('aria-expanded', 'true')

    await user.click(board)
    expect(screen.queryByRole('region', { name: 'Organizācijas' })).toBeNull()
    const boardPanel = screen.getByRole('region', { name: 'Lielākie atbalstītāji' })
    expect(within(boardPanel).getAllByRole('listitem')[0]).toHaveTextContent('SIA Labie')
    expect(list).toHaveAttribute('aria-expanded', 'false')
    expect(board).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: 'Lielākie atbalstītāji' })).toBeNull()
    expect(board).toHaveFocus()

    await user.click(railButton('Jaunumi'))
    const news = screen.getByRole('region', { name: 'Jaunumi' })
    expect(within(news).getByText(/steidzami vajadzīgs, mēs jums uzrakstīsim/)).toBeInTheDocument()
    expect(within(news).getByRole('textbox', { name: /E-pasts/ })).toBeInTheDocument()
    await user.click(within(news).getByRole('button', { name: 'Aizvērt' }))
    expect(screen.queryByRole('region', { name: 'Jaunumi' })).toBeNull()
    expect(railButton('Jaunumi')).toHaveFocus()
  })

  it('closes a panel when its button is pressed again, and when the map is pressed', async () => {
    vi.stubGlobal('fetch', fakeFetch({ [SNAPSHOT_URL]: { body: snapshotFixture } }))
    const { container } = renderWithProviders(<MapPage />)
    await screen.findByRole('group', { name: 'Kategorijas' })

    fireEvent.click(railButton('Organizācijas'))
    fireEvent.click(railButton('Organizācijas'))
    expect(screen.queryByRole('region', { name: 'Organizācijas' })).toBeNull()

    fireEvent.click(railButton('Organizācijas'))
    const mapArea = container.querySelector('section > div.absolute.inset-0')
    expect(mapArea).not.toBeNull()
    fireEvent.pointerDown(mapArea!)
    expect(screen.queryByRole('region', { name: 'Organizācijas' })).toBeNull()
  })

  it('returns focus to the rail when the map is pressed while focus is in the panel', async () => {
    vi.stubGlobal('fetch', fakeFetch({ [SNAPSHOT_URL]: { body: snapshotFixture } }))
    const { container } = renderWithProviders(<MapPage />)
    await screen.findByRole('group', { name: 'Kategorijas' })

    fireEvent.click(railButton('Organizācijas'))
    expect(screen.getByRole('region', { name: 'Organizācijas' })).toHaveFocus()
    fireEvent.pointerDown(container.querySelector('section > div.absolute.inset-0')!)
    expect(railButton('Organizācijas')).toHaveFocus()
  })

  it('closes the sheet on a phone when an organisation is chosen, focus back on the rail', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: true, media: query, addEventListener: () => undefined, removeEventListener: () => undefined }))
    vi.stubGlobal('fetch', fakeFetch({ [SNAPSHOT_URL]: { body: snapshotFixture } }))
    renderWithProviders(<MapPage />)
    await screen.findByRole('group', { name: 'Kategorijas' })

    fireEvent.click(railButton('Organizācijas'))
    fireEvent.click(screen.getByRole('button', { name: 'Rādīt kartē: Dzīvnieku patversme Ulubele' }))
    expect(screen.queryByRole('region', { name: 'Organizācijas' })).toBeNull()
    expect(railButton('Organizācijas')).toHaveFocus()
  })

  it('links the rail to the account, and opens the info as a panel rather than a page', () => {
    vi.stubGlobal('fetch', fakeFetch({}))
    renderWithProviders(<MapPage />)
    expect(within(rail()).getByRole('link', { name: 'Mans konts' })).toHaveAttribute('href', ROUTES.account)
    expect(within(rail()).queryByRole('link', { name: 'Par projektu' })).toBeNull()
    expect(railButton('Par projektu')).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows the info panel in three tabs, moved through with the arrow keys', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', fakeFetch({}))
    renderWithProviders(<MapPage />)

    await user.click(railButton('Par projektu'))
    const panel = screen.getByRole('region', { name: 'Par Dod ar prieku' })
    expect(panel).toHaveFocus()
    const tabs = within(panel).getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Par projektu', 'Kā palīdzēt', 'Par mums'])
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(within(panel).getByRole('tabpanel', { name: 'Par projektu' })).toHaveTextContent('Kā tas darbojas')

    tabs[0]?.focus()
    await user.keyboard('{ArrowRight}')
    expect(tabs[1]).toHaveFocus()
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true')
    expect(tabs[0]).toHaveAttribute('tabindex', '-1')
    const help = within(panel).getByRole('tabpanel', { name: 'Kā palīdzēt' })
    expect(within(help).getByRole('link', { name: /Kļūt par saņēmēju/ })).toHaveAttribute('href', ROUTES.register)
    expect(help).toHaveTextContent('Mēs pārbaudām')

    await user.keyboard('{End}')
    const us = within(panel).getByRole('tabpanel', { name: 'Par mums' })
    expect(us).toHaveTextContent('Uzturētājs: SIA HA Group')
    expect(us).toHaveTextContent('Reģ. Nr. 40203724866')
    expect(within(us).getByRole('link', { name: 'info@hagroup.lv' })).toHaveAttribute('href', 'mailto:info@hagroup.lv')
    expect(within(us).getByRole('img', { name: 'Unveil logotips' })).toHaveAttribute('src', '/projects/unveil.png')
    expect(within(us).getByRole('link', { name: /Event App/ })).toHaveAttribute('href', 'https://eventapp.lv')

    await user.keyboard('{Home}')
    expect(tabs[0]).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(tabs[2]).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: 'Par Dod ar prieku' })).toBeNull()
    expect(railButton('Par projektu')).toHaveFocus()
  })

  it('renders the first hundred organisations, then more on request', async () => {
    const many = Array.from({ length: 230 }, (_, i) => ({ ...snapshotFixture.charities[0]!, id: `c-${i}`, slug: `org-${i}` }))
    vi.stubGlobal('fetch', fakeFetch({ [SNAPSHOT_URL]: { body: { ...snapshotFixture, charities: many } } }))
    renderWithProviders(<MapPage />)
    await screen.findByRole('group', { name: 'Kategorijas' })
    fireEvent.click(railButton('Organizācijas'))
    const panel = screen.getByRole('region', { name: 'Organizācijas' })
    expect(within(panel).getAllByRole('button', { name: /^Rādīt kartē/ })).toHaveLength(100)
    expect(within(panel).getByText('Parādītas 100 no 230')).toBeInTheDocument()
    fireEvent.click(within(panel).getByRole('button', { name: 'Rādīt vēl 100' }))
    fireEvent.click(within(panel).getByRole('button', { name: 'Rādīt vēl 30' }))
    expect(within(panel).getAllByRole('button', { name: /^Rādīt kartē/ })).toHaveLength(230)
    expect(within(panel).queryByRole('button', { name: /^Rādīt vēl/ })).toBeNull()
  })

  it('shows the empty state, with the way to register, when no charity is published yet', async () => {
    vi.stubGlobal('fetch', fakeFetch({ [SNAPSHOT_URL]: { body: { ...snapshotFixture, charities: [], sponsorLeaderboard: [] } } }))
    renderWithProviders(<MapPage />)
    await waitFor(() => expect(screen.queryByRole('group', { name: 'Kategorijas' })).toBeNull())
    fireEvent.click(railButton('Organizācijas'))
    expect(await screen.findByRole('heading', { name: 'Kartē vēl nav nevienas organizācijas' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Pieteikt savu iestādi/ })).toHaveAttribute('href', ROUTES.register)
  })

  it('opens on the charity named in ?org=', async () => {
    vi.stubGlobal('fetch', fakeFetch({ [SNAPSHOT_URL]: { body: snapshotFixture } }))
    renderWithProviders(<MapPage />, { route: '/?org=ulubele' })
    await screen.findByRole('group', { name: 'Kategorijas' })
    fireEvent.click(railButton('Organizācijas'))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Rādīt kartē: Dzīvnieku patversme Ulubele' })).toHaveAttribute('aria-current', 'true'),
    )
  })

  it('shows the error over the map and in the list, and retries', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new TypeError('offline'))
    vi.stubGlobal('fetch', fetcher)
    renderWithProviders(<MapPage />)
    expect(await screen.findByText('Neizdevās ielādēt organizācijas')).toBeInTheDocument()
    fireEvent.click(railButton('Organizācijas'))
    expect(within(screen.getByRole('region', { name: 'Organizācijas' })).getByText('Neizdevās ielādēt organizācijas')).toBeInTheDocument()
    fetcher.mockImplementation(fakeFetch({ [SNAPSHOT_URL]: { body: snapshotFixture } }))
    fireEvent.click(screen.getByRole('button', { name: 'Mēģināt vēlreiz' }))
    expect(await screen.findByText('2 organizācijas')).toBeInTheDocument()
  })

  it('shows a busy list and leaderboard while the snapshot loads', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => undefined)))
    renderWithProviders(<MapPage />)
    fireEvent.click(railButton('Lielākie atbalstītāji'))
    expect(screen.getByRole('status')).toHaveTextContent('Ielādē organizācijas')
  })
})
