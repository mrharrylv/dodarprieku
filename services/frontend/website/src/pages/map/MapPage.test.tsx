import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import i18n from '@/i18n'
import { ThemeProvider } from '@/context/ThemeProvider'
import { resetSnapshotCache } from '@/hooks/useSnapshot'
import { fakeFetch, snapshotFixture } from '@/lib/snapshot.fixtures'
import { renderWithProviders } from '@/test/render'
import { MapPage } from './MapPage'

// The library must never be needed for the page's shell; importing it fails the test.
vi.mock('maplibre-gl', () => {
  throw new Error('maplibre-gl was imported')
})

describe('MapPage', () => {
  beforeEach(() => resetSnapshotCache())

  it('prerenders its shell (h1, intro, panel, register button) without fetching or the map', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const html = renderToString(
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>
          <MemoryRouter>
            <MapPage />
          </MemoryRouter>
        </ThemeProvider>
      </I18nextProvider>,
    )
    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toContain('Labdarības karte')
    expect(html).toContain('Atrodiet iestādi sev tuvumā')
    expect(html).toContain('href="/registreties"')
    expect(html).not.toContain('maplibregl')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('loads the snapshot, lists the charities and falls back when there is no WebGL', async () => {
    vi.stubGlobal('fetch', fakeFetch({ '/data/charities.json': { body: snapshotFixture } }))
    renderWithProviders(<MapPage />)
    expect(await screen.findByRole('button', { name: 'Rādīt kartē: Cēsu bērnu nams' })).toBeInTheDocument()
    expect(await screen.findByText('Karti nevar parādīt')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Rādīt kartē: Cēsu bērnu nams' }))
    expect(screen.getByRole('button', { name: 'Rādīt kartē: Cēsu bērnu nams' })).toHaveAttribute('aria-current', 'true')

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ulubele' } })
    expect(screen.getByText('1 organizācija')).toBeInTheDocument()
  })

  it('opens on the charity named in ?org=', async () => {
    vi.stubGlobal('fetch', fakeFetch({ '/data/charities.json': { body: snapshotFixture } }))
    renderWithProviders(<MapPage />, { route: '/?org=ulubele' })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Rādīt kartē: Dzīvnieku patversme Ulubele' })).toHaveAttribute('aria-current', 'true'),
    )
  })

  it('shows the error and retries', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new TypeError('offline'))
    vi.stubGlobal('fetch', fetcher)
    renderWithProviders(<MapPage />)
    expect(await screen.findByText('Neizdevās ielādēt organizācijas')).toBeInTheDocument()
    fetcher.mockImplementation(fakeFetch({ '/data/charities.json': { body: snapshotFixture } }))
    fireEvent.click(screen.getByRole('button', { name: 'Mēģināt vēlreiz' }))
    expect(await screen.findByText('2 organizācijas')).toBeInTheDocument()
  })

  it('toggles the bottom sheet', () => {
    vi.stubGlobal('fetch', fakeFetch({}))
    renderWithProviders(<MapPage />)
    const toggle = screen.getByRole('button', { name: 'Rādīt sarakstu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Paslēpt sarakstu' })).toHaveAttribute('aria-expanded', 'true')
  })
})
