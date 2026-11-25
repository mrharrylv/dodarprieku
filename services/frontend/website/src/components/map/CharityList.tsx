import { useTranslation } from 'react-i18next'

import { categoryById } from '@shared/catalog'
import type { PublicCharity } from '@shared/contracts'
import { cn } from '@/lib/cn'
import { coverUrl, topNeeds } from '@/lib/snapshot'
import { CategoryBadge } from '@/components/icons/CategoryBadge'
import { UrgentBadge } from '@/components/charity/UrgentBadge'

/**
 * The charities as a list: the accessible way through the map. Choosing one
 * flies the map to it and opens its popup.
 */
export const CharityList = ({
  charities,
  selectedId,
  onChoose,
}: {
  charities: readonly PublicCharity[]
  selectedId: string | null
  onChoose: (id: string) => void
}) => {
  const { t } = useTranslation('map')

  return (
    <ul className="space-y-2">
      {charities.map((charity) => {
        const { organization, category, address } = charity.profile
        const urgent = topNeeds(charity, 1)[0]?.urgent === true
        const cover = coverUrl(charity)
        const selected = charity.id === selectedId
        return (
          <li key={charity.id}>
            <button
              type="button"
              onClick={() => onChoose(charity.id)}
              aria-label={t('list.show', { name: organization.name })}
              aria-current={selected || undefined}
              className={cn(
                'flex w-full items-center gap-3 rounded-(--radius-lg) border p-2.5 text-left',
                'transition-[border-color,box-shadow,background-color] duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring-accent)',
                selected
                  ? 'border-(--ring-accent) bg-(--surface-accent-soft) shadow-(--shadow-subtle)'
                  : 'border-(--border-subtle) bg-(--surface-raised) hover:border-(--border-strong) hover:shadow-(--shadow-subtle)',
              )}
            >
              {cover !== undefined ? (
                <img src={cover} alt="" loading="lazy" referrerPolicy="no-referrer" draggable={false} className="h-14 w-14 shrink-0 rounded-(--radius-md) bg-(--surface-sunken) object-cover" />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-(--radius-md) bg-(--surface-sunken)">
                  <CategoryBadge category={category} />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-(--text-primary)">{organization.name}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-(length:--text-sm) text-(--text-secondary)">
                  <CategoryBadge category={category} size="sm" className="h-5 w-5 text-(length:--text-xs)" />
                  <span className="truncate">
                    {categoryById(category).label}, {address.city}
                  </span>
                </span>
              </span>
              {urgent && <UrgentBadge label={t('list.urgent')} />}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
