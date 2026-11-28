import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import type { PublicCharity } from '@shared/contracts'
import { useLocale } from '@/hooks/useLocale'
import { cn } from '@/lib/cn'
import { claimPath } from '@/lib/charity-links'
import { Icon } from '@/components/ui/Icon'
import { ACCENT_PILL } from './chrome/pill'
import { preloadProps } from './dock/dock-chunks'

/**
 * "Vai šī ir jūsu iestāde? Pieprasīt profilu": on a charity imported from a
 * public register that nobody has claimed yet (`claimable`). It stays until
 * a claim is approved, because until then the profile is still claimable.
 * The link is the same accent pill as "+ Kļūt par saņēmēju": it asks for the
 * same thing, a profile of one's own.
 */
export const ClaimLink = ({ charity, compact = false, className }: { charity: PublicCharity; compact?: boolean; className?: string }) => {
  const { t } = useTranslation('map')
  const { locale } = useLocale()
  if (charity.claimable !== true) return null
  const link = (
    <Link
      to={claimPath(charity.slug, locale)}
      data-dock-trigger="register"
      {...preloadProps('register')}
      className={cn(ACCENT_PILL, 'gap-1.5 px-4')}
    >
      <Icon name="flag" />
      {t('claim.action')}
    </Link>
  )
  // The small card has little height to spare: one line, the question beside the link.
  if (compact) {
    return (
      <p className={cn('flex flex-wrap items-center gap-x-3 gap-y-1.5 text-(length:--text-sm) text-(--text-secondary)', className)}>
        {t('claim.question')}
        {link}
      </p>
    )
  }
  return (
    <div className={cn('rounded-(--radius-lg) border border-dashed border-(--border-strong) bg-(--surface-sunken) px-3 py-2.5 text-(length:--text-sm)', className)}>
      <p className="text-(--text-secondary)">{t('claim.question')}</p>
      <div className="mt-2">{link}</div>
    </div>
  )
}
