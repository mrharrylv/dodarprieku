import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { categoryById } from '@shared/catalog'
import type { PublicCharity } from '@shared/contracts'
import { charityPath } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { coverUrl, topNeeds } from '@/lib/snapshot'
import { Icon } from '@/components/ui/Icon'
import { CategoryBadge } from '@/components/icons/CategoryBadge'
import { buttonClasses } from '@/components/ui/button-styles'
import { UrgentBadge } from '@/components/charity/UrgentBadge'

/** What a pin opens: the cover, name, category, city, three needs and the way in. */
export const MapPopupCard = ({ charity, onClose }: { charity: PublicCharity; onClose: () => void }) => {
  const { t } = useTranslation('map')
  const { locale } = useLocale()
  const { organization, category, address } = charity.profile
  const cover = coverUrl(charity)
  const needs = topNeeds(charity, 3)

  return (
    <article className="w-72 max-w-[80vw]" aria-label={organization.name}>
      <div className="relative">
        {cover !== undefined ? (
          <img
            src={cover}
            alt={t('popup.photoAlt', { name: organization.name })}
            className="aspect-[16/9] w-full bg-(--surface-sunken) object-cover"
            referrerPolicy="no-referrer"
            draggable={false}
          />
        ) : (
          <div className="flex aspect-[16/9] w-full items-center justify-center bg-(--surface-sunken)">
            <CategoryBadge category={category} size="lg" />
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label={t('popup.close')}
          className="absolute top-2 right-2 flex h-11 w-11 items-center justify-center rounded-full bg-(--surface-raised)/90 text-(--text-primary) shadow-(--shadow-card) hover:bg-(--surface-raised) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring-accent)"
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <h2 className="text-(length:--text-lg) leading-snug font-semibold text-(--text-primary)">
            {organization.name}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-(length:--text-sm) text-(--text-secondary)">
            <CategoryBadge category={category} size="sm" className="h-5 w-5 text-(length:--text-xs)" />
            <span>{categoryById(category).label}</span>
            <span aria-hidden="true">·</span>
            <span>{address.city}</span>
          </p>
        </div>
        {needs.length > 0 ? (
          <ul className="space-y-1.5 text-(length:--text-sm) text-(--text-primary)">
            {needs.map((need) => (
              <li key={need.key} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">{need.label}</span>
                {need.urgent && <UrgentBadge label={t('popup.urgent')} />}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-(length:--text-sm) text-(--text-muted)">{t('popup.noNeeds')}</p>
        )}
        <Link to={localePath(charityPath(charity.slug), locale)} className={buttonClasses('primary', 'sm', 'w-full')}>
          {t('popup.view')}
          <Icon name="arrowRight" />
        </Link>
      </div>
    </article>
  )
}
