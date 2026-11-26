import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import type { PublicCharity } from '@shared/contracts'
import { useLocale } from '@/hooks/useLocale'
import { cn } from '@/lib/cn'
import { claimPath } from '@/lib/charity-links'
import { Icon } from '@/components/ui/Icon'

/**
 * "Vai šī ir jūsu iestāde? Pieprasīt profilu": on a charity imported from a
 * public register that nobody has claimed yet (`claimable`). It stays until
 * a claim is approved, because until then the profile is still claimable.
 */
export const ClaimLink = ({ charity, compact = false, className }: { charity: PublicCharity; compact?: boolean; className?: string }) => {
  const { t } = useTranslation('map')
  const { locale } = useLocale()
  if (charity.claimable !== true) return null
  const link = (
    <Link
      to={claimPath(charity.slug, locale)}
      data-dock-trigger="register"
      className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-(--text-accent) underline-offset-4 hover:underline focus-visible:rounded-(--radius-sm) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring-accent)"
    >
      <Icon name="flag" />
      {t('claim.action')}
    </Link>
  )
  // The small card has little height to spare: one line, the question beside the link.
  if (compact) {
    return (
      <p className={cn('-my-2 flex flex-wrap items-center gap-x-2 text-(length:--text-sm) text-(--text-secondary)', className)}>
        {t('claim.question')}
        {link}
      </p>
    )
  }
  return (
    <div className={cn('rounded-(--radius-lg) border border-dashed border-(--border-strong) bg-(--surface-sunken) px-3 py-2.5 text-(length:--text-sm)', className)}>
      <p className="text-(--text-secondary)">{t('claim.question')}</p>
      <div className="mt-1">{link}</div>
    </div>
  )
}
