import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { categoryById } from '@shared/catalog'
import type { PublicCharity } from '@shared/contracts'
import { cn } from '@/lib/cn'
import { coverUrl, topNeeds } from '@/lib/snapshot'
import { CategoryBadge } from '@/components/icons/CategoryBadge'
import { UrgentBadge } from '@/components/charity/UrgentBadge'

/** How many rows render at first, and how many more each "Rādīt vēl" adds: a thousand rows at once stall a phone. */
const LIST_PAGE = 100

/**
 * The charities as a list: the accessible way through the map. Choosing one
 * flies the map to it and opens its popup. Renders LIST_PAGE rows, then more
 * on request; a new search or chip starts again from the first page (the
 * caller keys it by the filter).
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
  const [limit, setLimit] = useState(LIST_PAGE)
  const shown = charities.slice(0, limit)
  const rest = charities.length - shown.length

  return (
    <>
      <ul className="space-y-2">
        {shown.map((charity) => {
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
                  <span className="line-clamp-2 font-medium leading-snug text-(--text-primary)">{organization.name}</span>
                  <span className="mt-1 flex items-center gap-1.5 text-(length:--text-sm) text-(--text-secondary)">
                    <CategoryBadge category={category} size="sm" className="h-5 w-5 text-(length:--text-xs)" />
                    <span className="min-w-0 truncate">
                      {categoryById(category).label}, {address.city}
                    </span>
                  </span>
                  {urgent && <UrgentBadge label={t('list.urgent')} className="mt-1.5" />}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {rest > 0 && (
        <div className="mt-3 flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => setLimit((n) => n + LIST_PAGE)}
            className="min-h-11 rounded-full border border-(--border-strong) bg-(--surface-raised) px-5 text-(length:--text-sm) font-medium text-(--text-primary) transition-colors hover:border-(--ring-accent) hover:text-(--text-accent) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring-accent)"
          >
            {t('list.more', { count: Math.min(rest, LIST_PAGE) })}
          </button>
          <p className="text-(length:--text-xs) text-(--text-muted)">{t('list.shown', { shown: shown.length, total: charities.length })}</p>
        </div>
      )}
    </>
  )
}
