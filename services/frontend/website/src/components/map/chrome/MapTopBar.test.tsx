import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { NO_FILTER, type CharityFilter } from '@/lib/snapshot'
import { snapshotFixture } from '@/lib/snapshot.fixtures'
import { renderWithProviders } from '@/test/render'
import { MapTopBar } from './MapTopBar'

const READY = { status: 'ready', snapshot: snapshotFixture } as const

const bar = (compact: boolean, onFilter: (next: CharityFilter) => void = vi.fn(), filter: CharityFilter = NO_FILTER) => (
  <MapTopBar state={READY} filter={filter} onFilter={onFilter} selectedId={null} onChoose={vi.fn()} onRetry={vi.fn()} compact={compact} />
)

describe('MapTopBar', () => {
  it('shows the wordmark, the search field and the chips when nothing is docked', () => {
    renderWithProviders(bar(false))
    expect(screen.getByText('dod ar prieku')).not.toHaveAttribute('aria-hidden')
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Kategorijas' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Meklēt' })).toBeNull()
  })

  it('folds into the logo, a magnifier and two dropdowns beside a dock, and opens back out', () => {
    const { rerender } = renderWithProviders(bar(true))
    expect(screen.getByText('dod ar prieku')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByRole('searchbox')).toBeNull()
    expect(screen.queryByRole('group', { name: 'Kategorijas' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Ko vajag' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Meklēt' }))
    expect(screen.getByRole('searchbox')).toHaveFocus()
    // Escape on an empty field folds it back into the magnifier.
    fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' })
    expect(screen.getByRole('button', { name: 'Meklēt' })).toBeInTheDocument()

    rerender(bar(false))
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Kategorijas' })).toBeInTheDocument()
  })

  it('keeps a search with a query open while compact', () => {
    renderWithProviders(bar(true, vi.fn(), { ...NO_FILTER, query: 'Rīga' }))
    expect(screen.getByRole('searchbox')).toHaveValue('Rīga')
  })

  it('lists the categories with icons and counts in the compact dropdown, and chooses one', () => {
    const onFilter = vi.fn()
    renderWithProviders(bar(true, onFilter))
    const button = screen.getByRole('button', { name: 'Kategorijas' })
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    const list = screen.getByRole('group', { name: 'Kategorijas' })
    expect(within(list).getByRole('button', { name: /Visas kategorijas/ })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(within(list).getByRole('button', { name: /Dzīvnieku patversmes\s*1/ }))
    expect(onFilter).toHaveBeenCalledWith({ ...NO_FILTER, category: 'dzivnieku-patversme' })
    expect(screen.queryByRole('group', { name: 'Kategorijas' })).toBeNull()
    expect(button).toHaveFocus()
  })

  it('names the chosen category on the compact pill', () => {
    renderWithProviders(bar(true, vi.fn(), { ...NO_FILTER, category: 'dzivnieku-patversme' }))
    expect(screen.getByRole('button', { name: 'Kategorija: Dzīvnieku patversmes' })).toHaveTextContent('Dzīvnieku patversmes')
  })

  it('moves the chips to a line of their own when the brand and the search leave them too little room', () => {
    renderWithProviders(bar(false))
    const region = screen.getByRole('region', { name: /./ })
    expect(region).toHaveClass('md:flex-wrap')
    // Below xl (1024px: 56px left beside the search) the chips take a line of their own, the bar's whole width.
    const chips = screen.getByRole('group', { name: 'Kategorijas' }).parentElement?.parentElement
    expect(chips).toHaveClass('flex-wrap', 'md:w-full', 'md:flex-none', 'xl:w-auto', 'xl:flex-1')
  })
})
