import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { REGISTER_CTA } from '@/config/site'
import { useHydrated } from '@/hooks/useHydrated'
import { useLocale } from '@/hooks/useLocale'
import { useSignedIn } from '@/hooks/useSignedIn'
import { cn } from '@/lib/cn'
import { localePath } from '@/lib/locale-path'
import { Icon } from '@/components/ui/Icon'
import { PILL } from './pill'

/**
 * "+ Kļūt par saņēmēju", floating in the map's top right corner as the same
 * oval pill as the category chips, in the accent fill; on a phone, where the
 * top bar takes the width, centred at the bottom, clear of the zoom buttons.
 * It opens the registration panel (`/registreties`); while a panel is docked
 * on the right it is not shown (the account's login has its own way to register),
 * and nor is it to anyone logged in: they have an organisation already.
 */
export const MapActions = ({ hidden = false }: { hidden?: boolean }) => {
  const { t } = useTranslation('map')
  const { t: tc } = useTranslation('common')
  const { locale } = useLocale()
  const signedIn = useSignedIn(useHydrated()) === true
  if (hidden || signedIn) return null

  return (
    <div
      role="group"
      aria-label={t('chrome.actions')}
      className="pointer-events-none absolute inset-x-0 bottom-9 z-30 flex items-center justify-center md:inset-x-auto md:top-4 md:right-4 md:bottom-auto"
    >
      <Link
        to={localePath(REGISTER_CTA.to, locale)}
        data-dock-trigger="register"
        className={cn(
          PILL,
          'pointer-events-auto gap-1.5 px-4 font-semibold',
          'border-transparent bg-(--fill-accent) text-(--text-on-accent) shadow-(--shadow-card) hover:bg-(--fill-accent-hover) hover:shadow-(--shadow-lifted)',
        )}
      >
        <Icon name="plus" />
        <span>{tc(REGISTER_CTA.labelKey)}</span>
      </Link>
    </div>
  )
}
