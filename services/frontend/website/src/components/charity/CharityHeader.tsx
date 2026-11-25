import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import type { PublicCharity } from '@shared/contracts'
import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { mediaUrl } from '@/lib/snapshot'
import { Icon } from '@/components/ui/Icon'
import { CategoryLabel } from '@/components/icons/CategoryBadge'
import { FOCUS_PARAM } from './focus-param'

/**
 * The page's one h1, in every state: the charity's name once it is known,
 * otherwise the state's own heading. It is the same element throughout, so
 * the prerendered shell's h1 is the node the visitor ends up reading.
 */
export const CharityHeader = ({ title, charity }: { title: string; charity: PublicCharity | undefined }) => {
  const logoSrc = mediaUrl(charity?.profile.logo)
  const { t } = useTranslation('charity')

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
      {logoSrc !== undefined && charity !== undefined && (
        <img
          src={logoSrc}
          alt={t('gallery.logoAlt', { name: charity.profile.organization.name })}
          className="h-20 w-20 shrink-0 rounded-(--radius-xl) border border-(--border-subtle) bg-(--surface-raised) object-contain p-2 shadow-(--shadow-subtle)"
          referrerPolicy="no-referrer"
          draggable={false}
        />
      )}
      <div className="min-w-0 space-y-3">
        <h1 className="font-(family-name:--font-display) text-(length:--text-4xl) leading-tight font-semibold text-(--text-primary)">
          {title}
        </h1>
        {charity !== undefined && <CharityMeta charity={charity} />}
      </div>
    </div>
  )
}

const CharityMeta = ({ charity }: { charity: PublicCharity }) => {
  const { t } = useTranslation('charity')
  const { locale } = useLocale()
  const { category, address } = charity.profile
  const mapHref = `${localePath(ROUTES.home, locale)}?${FOCUS_PARAM}=${encodeURIComponent(charity.slug)}`

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <CategoryLabel category={category} />
      <p className="flex items-center gap-1.5 text-(--text-secondary)">
        <Icon name="pin" />
        <span>
          {address.street}, {address.city}
          {address.postalCode !== '' ? `, ${address.postalCode}` : ''}
        </span>
      </p>
      <Link to={mapHref} className="inline-flex min-h-11 items-center gap-1.5 font-medium text-(--text-accent) underline-offset-4 hover:underline">
        {t('showOnMap')}
        <Icon name="arrowRight" />
      </Link>
    </div>
  )
}
