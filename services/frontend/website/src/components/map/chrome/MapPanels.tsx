import { useTranslation } from 'react-i18next'

import type { SnapshotState } from '@/hooks/useSnapshot'
import type { CharityFilter } from '@/lib/snapshot'
import { MapPanelCard } from './MapPanelCard'
import { LeaderboardContent, NewsContent, OrganisationsContent } from './PanelContent'
import type { MapPanels as Panels } from './useMapPanels'

/** Whichever panel the rail has open, or nothing: the prerendered page has every panel closed. */
export const MapPanels = ({
  panels,
  state,
  filter,
  onFilter,
  selectedId,
  onChoose,
  onRetry,
}: {
  panels: Panels
  state: SnapshotState
  filter: CharityFilter
  onFilter: (next: CharityFilter) => void
  selectedId: string | null
  onChoose: (id: string) => void
  onRetry: () => void
}) => {
  const { t } = useTranslation('map')
  const { open } = panels
  if (open === null) return null

  const shell = { id: open, panelRef: panels.panelRef, onClose: () => panels.close({ restoreFocus: true }) }

  switch (open) {
    case 'list':
      return (
        <MapPanelCard key={open} {...shell} title={t('rail.list')}>
          <OrganisationsContent state={state} filter={filter} onFilter={onFilter} selectedId={selectedId} onChoose={onChoose} onRetry={onRetry} />
        </MapPanelCard>
      )
    case 'leaderboard':
      return (
        <MapPanelCard key={open} {...shell} title={t('rail.leaderboard')}>
          <LeaderboardContent state={state} onRetry={onRetry} />
        </MapPanelCard>
      )
    case 'news':
      return (
        <MapPanelCard key={open} {...shell} title={t('news.title')}>
          <NewsContent />
        </MapPanelCard>
      )
  }
}
