import { useTranslation } from 'react-i18next'

import { RegisterButton } from '@/components/layout/RegisterButton'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

/**
 * "+ Kļūt par saņēmēju" and the theme switch, floating in the map's top right
 * corner; on a phone, where the top bar takes the width, centred at the
 * bottom, clear of the zoom buttons.
 */
export const MapActions = () => {
  const { t } = useTranslation('map')

  return (
    <div
      role="group"
      aria-label={t('chrome.actions')}
      className="pointer-events-none absolute inset-x-0 bottom-9 z-30 flex items-center justify-center gap-2 md:inset-x-auto md:top-4 md:right-4 md:bottom-auto"
    >
      <ThemeToggle className="pointer-events-auto rounded-(--radius-md) border border-(--border-subtle) bg-(--surface-raised)/95 shadow-(--shadow-card) backdrop-blur-md hover:bg-(--surface-raised)" />
      <RegisterButton size="md" className="pointer-events-auto" />
    </div>
  )
}
