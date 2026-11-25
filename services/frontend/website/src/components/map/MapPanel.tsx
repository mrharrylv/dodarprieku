import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { CategoryId } from '@shared/catalog'
import type { PublicSnapshot } from '@shared/contracts'
import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { categoryCounts, filterCharities } from '@/lib/snapshot'
import type { SnapshotState } from '@/hooks/useSnapshot'
import { ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { ApiErrorNotice } from '@/components/charity/ApiErrorNotice'
import { SubscribeBox } from '@/components/pledge/SubscribeBox'
import { CategoryFilter } from './CategoryFilter'
import { CharityList } from './CharityList'
import { SearchBox } from './SearchBox'
import { SponsorLeaderboard } from './SponsorLeaderboard'

export interface PanelFilter {
  readonly query: string
  readonly category: CategoryId | null
}

/**
 * The side panel (a bottom sheet on a phone): the page's h1 and intro, the
 * search, the category chips, the list, the leaderboard and the newsletter.
 * The h1 and intro are in the prerendered HTML; everything that needs the
 * snapshot appears once it has loaded.
 */
export const MapPanel = ({
  state,
  filter,
  onFilter,
  selectedId,
  onChoose,
  onRetry,
}: {
  state: SnapshotState
  filter: PanelFilter
  onFilter: (next: PanelFilter) => void
  selectedId: string | null
  onChoose: (id: string) => void
  onRetry: () => void
}) => {
  const { t } = useTranslation('map')

  return (
    <div className="space-y-6 px-5 pt-2 pb-8 lg:pt-6">
      <div>
        <h1 id="map-title" className="font-(family-name:--font-display) text-(length:--text-2xl) leading-tight font-semibold text-(--text-primary)">
          {t('title')}
        </h1>
        <p className="mt-1.5 text-(--text-secondary)">{t('intro')}</p>
      </div>
      <PanelBody state={state} filter={filter} onFilter={onFilter} selectedId={selectedId} onChoose={onChoose} onRetry={onRetry} />
      <SubscribeBox />
    </div>
  )
}

const PanelBody = ({
  state,
  filter,
  onFilter,
  selectedId,
  onChoose,
  onRetry,
}: Parameters<typeof MapPanel>[0]) => {
  const { t } = useTranslation('map')
  if (state.status === 'loading') return <ListSkeleton label={t('loading')} />
  if (state.status === 'error') return <ApiErrorNotice error={state.error} title={t('loadError')} onRetry={onRetry} />
  if (state.snapshot.charities.length === 0) return <EmptyMap />
  return <Directory snapshot={state.snapshot} filter={filter} onFilter={onFilter} selectedId={selectedId} onChoose={onChoose} />
}

const Directory = ({
  snapshot,
  filter,
  onFilter,
  selectedId,
  onChoose,
}: {
  snapshot: PublicSnapshot
  filter: PanelFilter
  onFilter: (next: PanelFilter) => void
  selectedId: string | null
  onChoose: (id: string) => void
}) => {
  const { t } = useTranslation('map')
  const visible = filterCharities(snapshot.charities, filter)
  const counts = categoryCounts(snapshot.charities, filter.query)
  const total = counts.reduce((sum, c) => sum + c.count, 0)

  return (
    <>
      <div className="space-y-3">
        <SearchBox value={filter.query} onChange={(query) => onFilter({ ...filter, query })} />
        <CategoryFilter counts={counts} total={total} value={filter.category} onChange={(category) => onFilter({ ...filter, category })} />
      </div>
      <section aria-labelledby="charity-list-title" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="charity-list-title" className="text-(length:--text-lg) font-semibold text-(--text-primary)">
            {t('list.heading')}
          </h2>
          <p className="text-(length:--text-sm) text-(--text-secondary)" aria-live="polite">
            {t('list.count', { count: visible.length })}
          </p>
        </div>
        {visible.length > 0 ? (
          <CharityList charities={visible} selectedId={selectedId} onChoose={onChoose} />
        ) : (
          <div className="rounded-(--radius-lg) border border-dashed border-(--border-strong) p-5 text-center">
            <p className="text-(--text-secondary)">{t('list.noMatch')}</p>
            <button type="button" onClick={() => onFilter({ query: '', category: null })} className="mt-2 min-h-11 font-medium text-(--text-accent) underline underline-offset-2">
              {t('list.reset')}
            </button>
          </div>
        )}
      </section>
      <SponsorLeaderboard entries={snapshot.sponsorLeaderboard} />
    </>
  )
}

const EmptyMap = () => {
  const { t } = useTranslation('map')
  const { locale } = useLocale()
  return (
    <SoftCard>
      <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-(--surface-accent-soft) text-(length:--text-xl) text-(--text-accent)">
        <Icon name="heart" />
      </span>
      <h2 className="mt-3 text-(length:--text-lg) font-semibold text-(--text-primary)">{t('empty.title')}</h2>
      <p className="mt-1 text-(length:--text-sm) text-(--text-secondary)">{t('empty.body')}</p>
      <ButtonLink to={localePath(ROUTES.register, locale)} size="sm" className="mt-4">
        <Icon name="plus" />
        {t('empty.cta')}
      </ButtonLink>
    </SoftCard>
  )
}

const SoftCard = ({ children }: { children: ReactNode }) => (
  <div className="rounded-(--radius-xl) border border-(--border-accent-soft) bg-(--surface-accent-soft) p-6 text-center">{children}</div>
)

const ListSkeleton = ({ label }: { label: string }) => (
  <div aria-busy="true" className="space-y-2">
    <span className="sr-only" role="status">
      {label}
    </span>
    <div className="h-11 animate-pulse rounded-full bg-(--surface-sunken)" />
    <div className="flex gap-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-11 w-24 animate-pulse rounded-full bg-(--surface-sunken)" />
      ))}
    </div>
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className="flex items-center gap-3 rounded-(--radius-lg) border border-(--border-subtle) p-2.5">
        <div className="h-14 w-14 animate-pulse rounded-(--radius-md) bg-(--surface-sunken)" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-(--surface-sunken)" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-(--surface-sunken)" />
        </div>
      </div>
    ))}
  </div>
)
