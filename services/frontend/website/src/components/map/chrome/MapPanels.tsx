import { useTranslation } from 'react-i18next'

import type { SnapshotState } from '@/hooks/useSnapshot'
import { MapPanelCard } from './MapPanelCard'
import { InfoContent } from './InfoPanel'
import { LeaderboardContent, NewsContent } from './PanelContent'
import type { MapPanels as Panels } from './useMapPanels'

/** Whichever panel the rail has open, or nothing: the prerendered page has every panel closed. */
export const MapPanels = ({
  panels,
  state,
  onRetry,
}: {
  panels: Panels
  state: SnapshotState
  onRetry: () => void
}) => {
  const { t } = useTranslation('map')
  const { open } = panels
  if (open === null) return null

  const shell = { id: open, panelRef: panels.panelRef, onClose: () => panels.close({ restoreFocus: true }) }

  switch (open) {
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
    case 'info':
      return (
        <MapPanelCard key={open} {...shell} title={t('info.title')} wide>
          <InfoContent />
        </MapPanelCard>
      )
  }
}
