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
const search = (query: string) => fireEvent.change(screen.getByRole('searchbox'), { target: { value: query } })
const results = () => screen.getByRole('region', { name: 'Meklēšanas rezultāti' })

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

  it('has no organisations button on the rail: the list is the search results', async () => {
    vi.stubGlobal('fetch', fakeFetch({ [SNAPSHOT_URL]: { body: snapshotFixture } }))
    renderWithProviders(<MapPage />)
    await screen.findByRole('group', { name: 'Kategorijas' })
    expect(within(rail()).queryByRole('button', { name: 'Organizācijas' })).toBeNull()
    expect(within(rail()).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Lielākie atbalstītāji', 'Jaunumi', 'Par projektu'])
    expect(screen.queryByRole('region', { name: 'Meklēšanas rezultāti' })).toBeNull()
  })

  it('loads the snapshot, filters with the chips, and shows the search results to fly to', async () => {
    vi.stubGlobal('fetch', fakeFetch({ [SNAPSHOT_URL]: { body: snapshotFixture } }))
    renderWithProviders(<MapPage />)
    expect(await screen.findByText('Karti nevar parādīt')).toBeInTheDocument()
    const chips = await screen.findByRole('group', { name: 'Kategorijas' })
    // The chips count what the hearts count: organisations with needs. Cēsu bērnu nams has none.
    expect(within(chips).getByRole('button', { name: /Visas/ })).toHaveTextContent('1')
    expect(within(chips).getByRole('button', { name: /Bērnu nami/ })).toHaveTextContent('0')

    search('a')
    expect(within(results()).getByText('2 organizācijas')).toBeInTheDocument()
    fireEvent.click(within(chips).getByRole('button', { name: /Bērnu nami/ }))
    expect(within(results()).getByText('1 organizācija')).toBeInTheDocument()
    fireEvent.click(within(chips).getByRole('button', { name: /Visas/ }))

    search('ulubele')
    expect(within(results()).getByText('1 organizācija')).toBeInTheDocument()
    fireEvent.click(within(results()).getByRole('button', { name: 'Rādīt kartē: Dzīvnieku patversme Ulubele' }))
    expect(screen.queryByRole('region', { name: 'Meklēšanas rezultāti' })).toBeNull()

    search('ulubel')
    expect(within(results()).getByRole('button', { name: 'Rādīt kartē: Dzīvnieku patversme Ulubele' })).toHaveAttribute('aria-current', 'true')

    search('nekas')
    expect(within(results()).getByText('Neviena organizācija neatbilst meklējumam.')).toBeInTheDocument()
    fireEvent.click(within(results()).getByRole('button', { name: 'Rādīt visas' }))
    expect(screen.queryByRole('region', { name: 'Meklēšanas rezultāti' })).toBeNull()
    expect(screen.getByRole('searchbox')).toHaveValue('')
  })

  it('"Ko vajag" filters by need kind, combined with the chips, and "Visas vajadzības" resets it', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', fakeFetch({ [SNAPSHOT_URL]: { body: snapshotFixture } }))
    renderWithProviders(<MapPage />)
    const chips = await screen.findByRole('group', { name: 'Kategorijas' })
    const pill = screen.getByRole('button', { name: 'Ko vajag' })
    expect(pill).toHaveAttribute('aria-expanded', 'false')

    await user.click(pill)
    const list = screen.getByRole('group', { name: 'Ko vajag' })
    const animals = within(list).getByRole('checkbox', { name: /Dzīvnieku barība un aprūpe/ })
    expect(within(list).getAllByRole('checkbox')).toHaveLength(10)
    expect(animals.closest('label')).toHaveTextContent('1')
    expect(within(list).getByRole('button', { name: 'Visas vajadzības' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(within(list).getByRole('checkbox', { name: /Mācību lietas/ }))
    expect(screen.getByRole('button', { name: 'Ko vajag, izvēlētās vajadzības: 1' })).toBeInTheDocument()
    // Nobody needs school things: no chips have a match, and the organisation without needs is not offered either.
    expect(within(chips).getByRole('button', { name: /Visas/ })).toHaveTextContent('0')
    expect(within(chips).queryByRole('button', { name: /Bērnu nami/ })).toBeNull()

    await user.click(animals)
    expect(within(chips).getByRole('button', { name: /Dzīvnieku patversmes/ })).toHaveTextContent('1')
    search('a')
    expect(within(results()).getByText('1 organizācija')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ko vajag, izvēlētās vajadzības: 2' }))
    await user.click(screen.getByRole('button', { name: 'Ko vajag, izvēlētās vajadzības: 2' }))
    await user.click(within(screen.getByRole('group', { name: 'Ko vajag' })).getByRole('button', { name: 'Visas vajadzības' }))
    expect(screen.getByRole('button', { name: 'Ko vajag' })).toBeInTheDocument()
    // The press on the pill closed the results; typing opens them again, now with both.
    search('a ')
    expect(within(results()).getByText('2 organizācijas')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('group', { name: 'Ko vajag' })).toBeNull()
  })

  it('closes "Ko vajag" on Escape, focus back on the pill, and on a press outside', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', fakeFetch({ [SNAPSHOT_URL]: { body: snapshotFixture } }))
    renderWithProviders(<MapPage />)
    await screen.findByRole('group', { name: 'Kategorijas' })
    const pill = screen.getByRole('button', { name: 'Ko vajag' })
    await user.click(pill)
    within(screen.getByRole('group', { name: 'Ko vajag' })).getAllByRole('checkbox')[0]?.focus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('group', { name: 'Ko vajag' })).toBeNull()
    expect(pill).toHaveFocus()
    await user.click(pill)
    await user.click(screen.getByRole('heading', { level: 1 }))
    expect(screen.queryByRole('group', { name: 'Ko vajag' })).toBeNull()
  })

  it('says it is a test environment only while some needs on the map are made up', async () => {
    const demo = { ...snapshotFixture, charities: snapshotFixture.charities.map((c, i) => (i === 0 ? { ...c, demoNeeds: true } : c)) }
    vi.stubGlobal('fetch', fakeFetch({ [SNAPSHOT_URL]: { body: demo } }))
    const { unmount } = renderWithProviders(<MapPage />)
    expect(await screen.findByRole('note')).toHaveTextContent('Testa vide: daļa vajadzību ir izdomātas demonstrācijai.')
    unmount()
    resetSnapshotCache()
    vi.stubGlobal('fetch', fakeFetch({ [SNAPSHOT_URL]: { body: snapshotFixture } }))
    renderWithProviders(<MapPage />)
    await screen.findByRole('group', { name: 'Kategorijas' })
    expect(screen.queryByText(/Testa vide/)).toBeNull()
  })

  it('closes the search results on Escape, focus back in the field, and on a press outside', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', fakeFetch({ [SNAPSHOT_URL]: { body: snapshotFixture } }))
    const { container } = renderWithProviders(<MapPage />)
    await screen.findByRole('group', { name: 'Kategorijas' })

    await user.type(screen.getByRole('searchbox'), 'ul')
    await user.click(within(results()).getByRole('button', { name: /Ulubele/ }))
    expect(screen.queryByRole('region', { name: 'Meklēšanas rezultāti' })).toBeNull()

    await user.type(screen.getByRole('searchbox'), 'e')
    within(results()).getAllByRole('button')[0]?.focus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: 'Meklēšanas rezultāti' })).toBeNull()
    expect(screen.getByRole('searchbox')).toHaveFocus()

    await user.type(screen.getByRole('searchbox'), 'b')
    expect(results()).toBeInTheDocument()
    fireEvent.pointerDown(container.querySelector('[data-map-layer] > div.absolute.inset-0')!)
    expect(screen.queryByRole('region', { name: 'Meklēšanas rezultāti' })).toBeNull()
  })

  it('opens one panel at a time, moves focus into it, and returns focus on Escape and on close', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', fakeFetch({ [SNAPSHOT_URL]: { body: snapshotFixture } }))
    renderWithProviders(<MapPage />)
    await screen.findByRole('group', { name: 'Kategorijas' })

    const info = railButton('Par projektu')
    const board = railButton('Lielākie atbalstītāji')
    expect(board).toHaveAttribute('aria-expanded', 'false')
    expect(board).not.toHaveAttribute('aria-controls')

    await user.click(info)
    expect(screen.getByRole('region', { name: 'Par Dod ar prieku' })).toHaveAttribute('id', 'map-panel-info')
    expect(info).toHaveAttribute('aria-controls', 'map-panel-info')

    await user.click(board)
    expect(screen.queryByRole('region', { name: 'Par Dod ar prieku' })).toBeNull()
    const boardPanel = screen.getByRole('region', { name: 'Lielākie atbalstītāji' })
    expect(boardPanel).toHaveFocus()
    expect(within(boardPanel).getAllByRole('listitem')[0]).toHaveTextContent('SIA Labie')
    expect(info).toHaveAttribute('aria-expanded', 'false')
    expect(board).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: 'Lielākie atbalstītāji' })).toBeNull()
    expect(board).toHaveFocus()

    await user.click(railButton('Jaunumi'))
    const news = screen.getByRole('region', { name: 'Jaunumi' })
    expect(within(news).getByText(/steidzami vajadzīgs, mēs jums uzrakstīsim/)).toBeInTheDocument()
    expect(within(news).getByRole('textbox', { name: /E-pasts/ })).toBeInTheDocument()
    // The rail's sign-up is the general one: no charity attached.
    const posted = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, data: {} })))
    vi.stubGlobal('fetch', posted)
    await user.type(within(news).getByRole('textbox', { name: /E-pasts/ }), 'ilze@example.lv')
    await user.click(within(news).getByRole('checkbox', { name: /Piekrītu saņemt/ }))
    await user.click(within(news).getByRole('button', { name: 'Pierakstīties' }))
    await waitFor(() => expect(posted).toHaveBeenCalled())
    expect(JSON.parse(String(posted.mock.calls[0]?.[1]?.body))).toEqual({ email: 'ilze@example.lv', consent: true, general: true })
    await screen.findByText('Paldies! Jūsu pieraksts ir saņemts.')
    await user.click(within(news).getByRole('button', { name: 'Aizvērt' }))
    expect(screen.queryByRole('region', { name: 'Jaunumi' })).toBeNull()
    expect(railButton('Jaunumi')).toHaveFocus()
  })

  it('closes a panel when its button is pressed again, and when the map is pressed', async () => {
    vi.stubGlobal('fetch', fakeFetch({ [SNAPSHOT_URL]: { body: snapshotFixture } }))
    const { container } = renderWithProviders(<MapPage />)
    await screen.findByRole('group', { name: 'Kategorijas' })

    fireEvent.click(railButton('Jaunumi'))
    fireEvent.click(railButton('Jaunumi'))
    expect(screen.queryByRole('region', { name: 'Jaunumi' })).toBeNull()

    fireEvent.click(railButton('Jaunumi'))
    const mapArea = container.querySelector('[data-map-layer] > div.absolute.inset-0')
    expect(mapArea).not.toBeNull()
    fireEvent.pointerDown(mapArea!)
    expect(screen.queryByRole('region', { name: 'Jaunumi' })).toBeNull()
  })

  it('returns focus to the rail when the map is pressed while focus is in the panel', async () => {
    vi.stubGlobal('fetch', fakeFetch({ [SNAPSHOT_URL]: { body: snapshotFixture } }))
    const { container } = renderWithProviders(<MapPage />)
    await screen.findByRole('group', { name: 'Kategorijas' })

    fireEvent.click(railButton('Jaunumi'))
    expect(screen.getByRole('region', { name: 'Jaunumi' })).toHaveFocus()
    fireEvent.pointerDown(container.querySelector('[data-map-layer] > div.absolute.inset-0')!)
    expect(railButton('Jaunumi')).toHaveFocus()
  })

  it('closes an open panel when an organisation is chosen from the search', async () => {
    vi.stubGlobal('fetch', fakeFetch({ [SNAPSHOT_URL]: { body: snapshotFixture } }))
    renderWithProviders(<MapPage />)
    await screen.findByRole('group', { name: 'Kategorijas' })

    fireEvent.click(railButton('Lielākie atbalstītāji'))
    search('ulubele')
    fireEvent.click(within(results()).getByRole('button', { name: 'Rādīt kartē: Dzīvnieku patversme Ulubele' }))
    expect(screen.queryByRole('region', { name: 'Lielākie atbalstītāji' })).toBeNull()
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
    expect(within(us).getByRole('link', { name: /EventApp/ })).toHaveAttribute('href', 'https://eventapp.lv')

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
    search('patversme')
    const panel = results()
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
    search('x')
    expect(await screen.findByRole('heading', { name: 'Kartē vēl nav nevienas organizācijas' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Pieteikt savu iestādi/ })).toHaveAttribute('href', ROUTES.register)
  })

  it('opens on the charity named in ?org=', async () => {
    vi.stubGlobal('fetch', fakeFetch({ [SNAPSHOT_URL]: { body: snapshotFixture } }))
    renderWithProviders(<MapPage />, { route: '/?org=ulubele' })
    await screen.findByRole('group', { name: 'Kategorijas' })
    search('ulubele')
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Rādīt kartē: Dzīvnieku patversme Ulubele' })).toHaveAttribute('aria-current', 'true'),
    )
  })

  it('shows the error over the map and in the search results, and retries', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new TypeError('offline'))
    vi.stubGlobal('fetch', fetcher)
    renderWithProviders(<MapPage />)
    expect(await screen.findByText('Neizdevās ielādēt organizācijas')).toBeInTheDocument()
    search('a')
    expect(within(results()).getByText('Neizdevās ielādēt organizācijas')).toBeInTheDocument()
    fetcher.mockImplementation(fakeFetch({ [SNAPSHOT_URL]: { body: snapshotFixture } }))
    fireEvent.click(within(results()).getByRole('button', { name: 'Mēģināt vēlreiz' }))
    expect(await screen.findByText('2 organizācijas')).toBeInTheDocument()
  })

  it('shows a busy list and leaderboard while the snapshot loads', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => undefined)))
    renderWithProviders(<MapPage />)
    fireEvent.click(railButton('Lielākie atbalstītāji'))
    expect(screen.getByRole('status')).toHaveTextContent('Ielādē organizācijas')
  })
})
