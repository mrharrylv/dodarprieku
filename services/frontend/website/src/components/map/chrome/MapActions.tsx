import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { REGISTER_CTA, ROUTES } from '@/config/site'
import { useHydrated } from '@/hooks/useHydrated'
import { useLocale } from '@/hooks/useLocale'
import { useSignedIn } from '@/hooks/useSignedIn'
import { cn } from '@/lib/cn'
import { localePath } from '@/lib/locale-path'
import { Icon } from '@/components/ui/Icon'
import { preloadProps } from '../dock/dock-chunks'
import { ACCENT_PILL, GLASS, PILL } from './pill'

/**
 * The two buttons that open the large panel docked on the right, so they sit
 * on the right too: "+ Kļūt par saņēmēju" in the accent fill and, under it,
 * "Mans konts". On a phone, where the top bar takes the width, they sit at the
 * bottom centre, one above the other: side by side they would reach the zoom
 * buttons at the bottom right. Anyone logged in has an
 * organisation already, so for them only "Mans konts" is there. While a dock
 * is open they fade out under it rather than vanish, and fade back as it
 * slides away; meanwhile they are out of reach. Each starts fetching its
 * dock's chunk on hover, focus or touch.
 */
export const MapActions = ({ hidden = false }: { hidden?: boolean }) => {
  const { t } = useTranslation('map')
  const { t: tc } = useTranslation('common')
  const { locale } = useLocale()
  const signedIn = useSignedIn(useHydrated()) === true

  return (
    <div
      role="group"
      aria-label={t('chrome.actions')}
      inert={hidden}
      data-hidden={hidden || undefined}
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-9 z-30 flex flex-col items-center gap-2',
        'md:inset-x-auto md:top-4 md:right-4 md:bottom-auto md:items-end md:gap-2.5',
        'transition-opacity duration-300 ease-(--ease-out-soft)',
        hidden ? 'opacity-0' : 'opacity-100',
      )}
    >
      {!signedIn && (
        <Link
          to={localePath(REGISTER_CTA.to, locale)}
          data-dock-trigger="register"
          {...preloadProps('register')}
          className={cn(ACCENT_PILL, 'pointer-events-auto gap-1.5 px-4')}
        >
          <Icon name="plus" />
          <span>{tc(REGISTER_CTA.labelKey)}</span>
        </Link>
      )}
      <Link
        to={localePath(ROUTES.account, locale)}
        data-dock-trigger="account"
        {...preloadProps('account')}
        className={cn(
          PILL,
          GLASS,
          'pointer-events-auto gap-1.5 border-(--border-subtle) px-4 font-semibold text-(--text-primary) hover:border-(--border-strong) hover:bg-(--surface-raised)/90',
        )}
      >
        <Icon name="user" />
        <span>{t('rail.account')}</span>
      </Link>
    </div>
  )
}
