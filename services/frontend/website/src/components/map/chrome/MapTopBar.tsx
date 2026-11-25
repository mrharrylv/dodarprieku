import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { ROUTES, SITE } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import type { SnapshotState } from '@/hooks/useSnapshot'
import { cn } from '@/lib/cn'
import { localePath } from '@/lib/locale-path'
import { categoryCounts, type CharityFilter as MapFilter } from '@/lib/snapshot'
import { BrandMark } from '@/components/layout/BrandMark'
import { CategoryFilter } from '../CategoryFilter'
import { SearchBox } from '../SearchBox'

/**
 * The floating bar over the map: the brand (home), the search and the
 * category chips. One row on a wide screen, the chips scrolling inside it; on
 * a phone the brand and the search sit on top and the chips scroll beneath.
 * The search works from the first frame; the chips appear with the snapshot.
 */
export const MapTopBar = ({
  state,
  filter,
  onFilter,
}: {
  state: SnapshotState
  filter: MapFilter
  onFilter: (next: MapFilter) => void
}) => {
  const { t } = useTranslation('map')
  const { locale } = useLocale()

  return (
    <div
      role="region"
      aria-label={t('chrome.label')}
      className={cn(
        'absolute inset-x-3 top-3 z-30 flex flex-col gap-2 rounded-(--radius-xl) border border-(--border-subtle) p-2',
        'bg-(--surface-raised)/90 shadow-(--shadow-lifted) backdrop-blur-md',
        'md:inset-x-auto md:top-4 md:left-4 md:max-w-[calc(100%-22rem)] md:flex-row md:items-center md:rounded-full md:p-1.5',
      )}
    >
      <div className="flex min-w-0 items-center gap-2 md:shrink-0">
        <Link
          to={localePath(ROUTES.home, locale)}
          aria-label={t('chrome.home')}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full pr-2 pl-1 font-(family-name:--font-display) text-(length:--text-lg) font-semibold tracking-tight text-(--text-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring-accent)"
        >
          <BrandMark className="h-8 w-8 md:h-9 md:w-9" />
          <span className="text-(length:--text-base) whitespace-nowrap md:text-(length:--text-lg)">{SITE.name}</span>
        </Link>
        <SearchBox value={filter.query} onChange={(query) => onFilter({ ...filter, query })} className="min-w-0 flex-1 md:w-72 md:flex-none lg:w-80" />
      </div>
      <Chips state={state} filter={filter} onFilter={onFilter} />
    </div>
  )
}

const Chips = ({ state, filter, onFilter }: { state: SnapshotState; filter: MapFilter; onFilter: (next: MapFilter) => void }) => {
  if (state.status === 'error') return null
  if (state.status === 'loading') {
    return (
      <div aria-hidden="true" className="flex min-w-0 flex-1 gap-2 overflow-hidden md:pr-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-11 w-28 shrink-0 animate-pulse rounded-full bg-(--surface-sunken)" />
        ))}
      </div>
    )
  }
  if (state.snapshot.charities.length === 0) return null
  const counts = categoryCounts(state.snapshot.charities, filter.query)
  const total = counts.reduce((sum, c) => sum + c.count, 0)
  return (
    <CategoryFilter
      counts={counts}
      total={total}
      value={filter.category}
      onChange={(category) => onFilter({ ...filter, category })}
      className="dp-fade-x -m-0.5 min-w-0 flex-1 p-0.5 pr-8"
    />
  )
}
