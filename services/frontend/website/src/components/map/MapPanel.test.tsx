import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { EMPTY_SNAPSHOT } from '@/lib/snapshot'
import { snapshotFixture } from '@/lib/snapshot.fixtures'
import { renderWithProviders } from '@/test/render'
import { MapPanel, type PanelFilter } from './MapPanel'
import type { SnapshotState } from '@/hooks/useSnapshot'

const ready: SnapshotState = { status: 'ready', snapshot: snapshotFixture }

const renderPanel = (state: SnapshotState, filter: PanelFilter = { query: '', category: null }) => {
  const onFilter = vi.fn()
  const onChoose = vi.fn()
  const onRetry = vi.fn()
  renderWithProviders(<MapPanel state={state} filter={filter} onFilter={onFilter} selectedId={null} onChoose={onChoose} onRetry={onRetry} />)
  return { onFilter, onChoose, onRetry }
}

describe('MapPanel', () => {
  it('always shows the h1 and intro, and a busy list while loading', () => {
    renderPanel({ status: 'loading' })
    expect(screen.getByRole('heading', { level: 1, name: 'Labdarības karte' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Ielādē organizācijas')
  })

  it('lists the charities, counts them and flies to one on click', () => {
    const { onChoose } = renderPanel(ready)
    expect(screen.getByText('2 organizācijas')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Rādīt kartē: Cēsu bērnu nams' }))
    expect(onChoose).toHaveBeenCalledWith('c-cesis')
    expect(screen.getByText('Steidzami')).toBeInTheDocument()
  })

  it('searches and filters by category, with counts on the chips', () => {
    const { onFilter } = renderPanel(ready)
    fireEvent.change(screen.getByRole('searchbox', { name: 'Meklēt pēc nosaukuma vai pilsētas' }), { target: { value: 'cēsis' } })
    expect(onFilter).toHaveBeenLastCalledWith({ query: 'cēsis', category: null })
    const chips = screen.getByRole('group', { name: 'Kategorijas' })
    const all = within(chips).getByRole('button', { name: /Visas/ })
    expect(all).toHaveAttribute('aria-pressed', 'true')
    expect(all).toHaveTextContent('2')
    fireEvent.click(within(chips).getByRole('button', { name: /Bērnu nami/ }))
    expect(onFilter).toHaveBeenLastCalledWith({ query: '', category: 'bernu-nams' })
  })

  it('narrows the list to the filter and toggles a chip back off', () => {
    const { onFilter } = renderPanel(ready, { query: '', category: 'bernu-nams' })
    expect(screen.getByText('1 organizācija')).toBeInTheDocument()
    expect(screen.queryByText('Dzīvnieku patversme Ulubele')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Bērnu nami/ }))
    expect(onFilter).toHaveBeenLastCalledWith({ query: '', category: null })
  })

  it('says when nothing matches and resets', () => {
    const { onFilter } = renderPanel(ready, { query: 'nekas', category: null })
    expect(screen.getByText('Neviena organizācija neatbilst meklējumam.')).toBeInTheDocument()
    expect(screen.getByText('0 organizāciju')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Rādīt visas' }))
    expect(onFilter).toHaveBeenLastCalledWith({ query: '', category: null })
    fireEvent.click(screen.getByRole('button', { name: 'Notīrīt meklēšanu' }))
  })

  it('renders the sponsor leaderboard, most charities first, with links and counts', () => {
    renderPanel(ready)
    const board = screen.getByRole('region', { name: 'Lielākie atbalstītāji' })
    const rows = within(board).getAllByRole('listitem')
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining('SIA Labie'),
      expect.stringContaining('AS Bez saites'),
      expect.stringContaining('SIA Mazie'),
    ])
    expect(rows[0]).toHaveTextContent('Atbalsta 3 organizācijas')
    expect(rows[2]).toHaveTextContent('Atbalsta 1 organizāciju')
    expect(within(rows[0]!).getByRole('link')).toHaveAttribute('href', 'https://labie.test/')
    expect(within(rows[0]!).getByRole('img', { name: 'SIA Labie logotips' })).toBeInTheDocument()
    expect(within(rows[1]!).queryByRole('link')).toBeNull()
  })

  it('shows the empty state with the way to register', () => {
    renderPanel({ status: 'ready', snapshot: EMPTY_SNAPSHOT })
    expect(screen.getByRole('heading', { name: 'Kartē vēl nav nevienas organizācijas' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Pieteikt savu iestādi/ })).toHaveAttribute('href', '/registreties')
  })

  it('shows an error with a retry', () => {
    const { onRetry } = renderPanel({ status: 'error', error: { kind: 'network' } })
    expect(screen.getByRole('alert')).toHaveTextContent('Neizdevās ielādēt organizācijas')
    expect(screen.getByRole('alert')).toHaveTextContent('Pārbaudiet interneta savienojumu')
    fireEvent.click(screen.getByRole('button', { name: 'Mēģināt vēlreiz' }))
    expect(onRetry).toHaveBeenCalled()
  })
})
