import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import type { SnapshotState } from '@/hooks/useSnapshot'
import { localePath } from '@/lib/locale-path'
import { filterCharities, NO_FILTER, type CharityFilter } from '@/lib/snapshot'
import { ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { ApiErrorNotice } from '@/components/charity/ApiErrorNotice'
import { SubscribeBox } from '@/components/pledge/SubscribeBox'
import { CharityList } from '../CharityList'
import { SponsorLeaderboard } from '../SponsorLeaderboard'

/** The organisations that match the search, the chip and the need kinds, each one a fly-to: the search's results. */
export const OrganisationsContent = ({
  state,
  filter,
  onFilter,
  selectedId,
  onChoose,
  onRetry,
}: {
  state: SnapshotState
  filter: CharityFilter
  onFilter: (next: CharityFilter) => void
  selectedId: string | null
  onChoose: (id: string) => void
  onRetry: () => void
}) => {
  const { t } = useTranslation('map')
  if (state.status !== 'ready') return <Unready state={state} onRetry={onRetry} />
  if (state.snapshot.charities.length === 0) return <EmptyMap />

  const visible = filterCharities(state.snapshot.charities, filter)
  return (
    <div className="space-y-3">
      <p className="text-(length:--text-sm) text-(--text-secondary)" aria-live="polite">
        {t('list.count', { count: visible.length })}
      </p>
      {visible.length > 0 ? (
        <CharityList key={`${filter.query}|${filter.category ?? ''}|${filter.kinds.join(',')}`} charities={visible} selectedId={selectedId} onChoose={onChoose} />
      ) : (
        <div className="rounded-(--radius-lg) border border-dashed border-(--border-strong) p-5 text-center">
          <p className="text-(--text-secondary)">{t('list.noMatch')}</p>
          <button
            type="button"
            onClick={() => onFilter(NO_FILTER)}
            className="mt-2 min-h-11 font-medium text-(--text-accent) underline underline-offset-2"
          >
            {t('list.reset')}
          </button>
        </div>
      )}
    </div>
  )
}

/** "Lielākie atbalstītāji": the companies on the most sponsor walls. */
export const LeaderboardContent = ({ state, onRetry }: { state: SnapshotState; onRetry: () => void }) =>
  state.status === 'ready' ? (
    <SponsorLeaderboard entries={state.snapshot.sponsorLeaderboard} titled={false} />
  ) : (
    <Unready state={state} onRetry={onRetry} />
  )

/** "Jaunumi": the sign-up for a line when something is urgently needed. */
export const NewsContent = () => {
  const { t } = useTranslation('map')
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-(--radius-lg) bg-(--surface-accent-soft) p-4">
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--surface-raised) text-(length:--text-xl) text-(--text-accent)">
          <Icon name="mail" />
        </span>
        <p className="pt-0.5 text-(length:--text-sm) text-(--text-primary)">{t('news.body')}</p>
      </div>
      <SubscribeBox bare />
    </div>
  )
}

const Unready = ({ state, onRetry }: { state: Exclude<SnapshotState, { status: 'ready' }>; onRetry: () => void }) => {
  const { t } = useTranslation('map')
  if (state.status === 'error') return <ApiErrorNotice error={state.error} title={t('loadError')} onRetry={onRetry} />
  return <ListSkeleton label={t('loading')} />
}

const EmptyMap = () => {
  const { t } = useTranslation('map')
  const { locale } = useLocale()
  return (
    <SoftCard>
      <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-(--surface-raised) text-(length:--text-xl) text-(--text-accent)">
        <Icon name="heart" />
      </span>
      <h3 className="mt-3 text-(length:--text-lg) font-semibold text-(--text-primary)">{t('empty.title')}</h3>
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
