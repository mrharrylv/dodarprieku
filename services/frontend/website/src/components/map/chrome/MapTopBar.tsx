import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { ROUTES, SITE } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import type { SnapshotState } from '@/hooks/useSnapshot'
import { cn } from '@/lib/cn'
import { localePath } from '@/lib/locale-path'
import { categoryCounts, needKindCounts, type CharityFilter as MapFilter } from '@/lib/snapshot'
import { BrandMark } from '@/components/layout/BrandMark'
import { Icon } from '@/components/ui/Icon'
import { CategoryFilter } from '../CategoryFilter'
import { CategoryMenu } from '../CategoryMenu'
import { NeedKindFilter } from '../NeedKindFilter'
import { SearchBox } from '../SearchBox'
import { GLASS, PILL } from './pill'
import { OrganisationsContent } from './PanelContent'
import { SearchResults } from './SearchResults'

/**
 * What floats over the top of the map: the brand (home), the search, "Ko vajag"
 * and the category chips, each on its own see-through surface rather than one bar.
 * One row on a wide screen (xl), the chips scrolling inside it (or laid out
 * all at once by their chevron); narrower, and on a phone, the brand and the
 * search sit on top and the chips take the line beneath, the bar's whole
 * width (the rail and its panels start below that line). The search
 * works from the first frame; the chips appear with the snapshot. Typing
 * opens the matching organisations under the field; choosing one flies there.
 * With a panel docked on the right it keeps to the map's visible left part
 * (`--dock-inset`), and is `compact`: the brand is its mark alone, the search
 * a magnifier that opens into the field, and the chips one dropdown pill like
 * "Ko vajag". When the panel closes it all opens out again.
 */
export const MapTopBar = ({
  state,
  filter,
  onFilter,
  selectedId,
  onChoose,
  onRetry,
  compact = false,
}: {
  state: SnapshotState
  filter: MapFilter
  onFilter: (next: MapFilter) => void
  selectedId: string | null
  onChoose: (id: string) => void
  onRetry: () => void
  compact?: boolean
}) => {
  const { t } = useTranslation('map')
  const { locale } = useLocale()
  const row = useRef<HTMLDivElement>(null)
  const [resultsOpen, setResultsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const showResults = resultsOpen && filter.query.trim() !== ''
  // The parts that swap with the mode rise in as they appear: never on the first paint, only after a dock has opened.
  const [switched, setSwitched] = useState(compact)
  if (compact && !switched) setSwitched(true)
  const rise = switched ? 'dp-chrome-in' : ''
  // Folded into its magnifier only while compact, closed and empty: a query in it keeps it open.
  const folded = compact && !searchOpen && filter.query === ''

  return (
    <div
      role="region"
      aria-label={t('chrome.label')}
      data-compact={compact || undefined}
      className={cn(
        'pointer-events-none absolute inset-x-3 top-3 z-40 flex flex-col gap-2',
        'md:inset-x-auto md:top-4 md:left-4 md:max-w-[calc(100%-var(--actions-room,19rem)-var(--dock-inset,0px))] md:flex-row md:flex-wrap md:items-start md:gap-2.5',
      )}
    >
      <div ref={row} className="pointer-events-auto relative flex min-w-0 items-center gap-2 md:shrink-0">
        <Link
          to={localePath(ROUTES.home, locale)}
          aria-label={t('chrome.home')}
          className={cn(
            GLASS,
            'inline-flex h-11 shrink-0 items-center rounded-full border border-(--border-subtle) pl-1 font-(family-name:--font-display) font-semibold tracking-tight text-(--text-primary)',
            'transition-[padding] duration-300 ease-(--ease-out-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring-accent)',
            compact ? 'pr-1' : 'pr-3.5',
          )}
        >
          <BrandMark className="h-8 w-8 shrink-0" />
          <span
            aria-hidden={compact || undefined}
            className={cn(
              'overflow-hidden text-(length:--text-base) whitespace-nowrap transition-[max-width,opacity,margin] duration-300 ease-(--ease-out-soft)',
              compact ? 'ml-0 max-w-0 opacity-0' : 'ml-2 max-w-40 opacity-100',
            )}
          >
            {SITE.wordmark}
          </span>
        </Link>
        {folded ? (
          <button
            type="button"
            aria-label={t('search.open')}
            aria-expanded={false}
            onClick={() => setSearchOpen(true)}
            className={cn(PILL, GLASS, 'w-11 justify-center border-(--border-strong) text-(length:--text-lg) text-(--text-primary) hover:bg-(--surface-raised)/90')}
          >
            <Icon name="search" />
          </button>
        ) : (
          <SearchBox
            value={filter.query}
            onChange={(query) => {
              onFilter({ ...filter, query })
              setResultsOpen(true)
            }}
            autoFocus={compact && searchOpen}
            {...(compact ? { onLeave: () => setSearchOpen(false) } : {})}
            className={cn(rise, 'min-w-0 flex-1 md:flex-none', compact ? 'md:w-60' : 'md:w-72 lg:w-80')}
            inputClassName={cn(GLASS, 'focus:bg-(--surface-raised)/95')}
          />
        )}
        {showResults && (
          <SearchResults
            within={row}
            onDismiss={(restoreFocus) => {
              setResultsOpen(false)
              if (restoreFocus) row.current?.querySelector('input')?.focus()
            }}
          >
            <OrganisationsContent
              state={state}
              filter={filter}
              onFilter={onFilter}
              selectedId={selectedId}
              onChoose={(id) => {
                setResultsOpen(false)
                onChoose(id)
              }}
              onRetry={onRetry}
            />
          </SearchResults>
        )}
      </div>
      <Chips state={state} filter={filter} onFilter={onFilter} compact={compact} rise={rise} />
    </div>
  )
}

const Chips = ({
  state,
  filter,
  onFilter,
  compact,
  rise,
}: {
  state: SnapshotState
  filter: MapFilter
  onFilter: (next: MapFilter) => void
  compact: boolean
  rise: string
}) => {
  if (state.status === 'error') return null
  if (state.status === 'loading') {
    return (
      <div aria-hidden="true" className="flex min-w-0 flex-1 gap-2 overflow-hidden md:pr-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cn(GLASS, 'h-11 w-28 shrink-0 animate-pulse rounded-full')} />
        ))}
      </div>
    )
  }
  const { charities } = state.snapshot
  if (charities.length === 0) return null
  // The chips count what the map's hearts count: organisations with needs, of the chosen kinds.
  const counts = categoryCounts(charities, filter)
  const total = counts.reduce((sum, c) => sum + c.count, 0)
  const category = (next: MapFilter['category']) => onFilter({ ...filter, category: next })
  return (
    // flex-wrap: the chips laid out all at once take a line of their own, under "Ko vajag".
    <div className={cn('flex min-w-0 flex-wrap items-start gap-2', !compact && 'flex-1 md:w-full md:flex-none xl:w-auto xl:flex-1')}>
      <NeedKindFilter counts={needKindCounts(charities, filter)} value={filter.kinds} onChange={(kinds) => onFilter({ ...filter, kinds })} />
      {compact ? (
        <div key="menu" className={rise}>
          <CategoryMenu counts={counts} total={total} value={filter.category} onChange={category} />
        </div>
      ) : (
        <CategoryFilter
          key="chips"
          counts={counts}
          total={total}
          value={filter.category}
          onChange={category}
          className={cn(rise, 'pointer-events-auto min-w-0 flex-1')}
        />
      )}
    </div>
  )
}
