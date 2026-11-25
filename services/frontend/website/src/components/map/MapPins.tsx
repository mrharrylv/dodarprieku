import { useTranslation } from 'react-i18next'

import { categoryById } from '@shared/catalog'
import type { PublicCharity } from '@shared/contracts'
import { cn } from '@/lib/cn'
import { CategoryBadge } from '@/components/icons/CategoryBadge'

const PIN = cn(
  'dp-pin relative flex min-h-11 min-w-11 items-center justify-center rounded-full',
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--ring-accent)',
)

/** One charity on the map: its category badge, a real button with its name. */
export const CharityPin = ({
  charity,
  selected,
  onSelect,
}: {
  charity: PublicCharity
  selected: boolean
  onSelect: (id: string) => void
}) => {
  const { t } = useTranslation('map')
  const { category, organization } = charity.profile

  return (
    <button
      type="button"
      className={PIN}
      aria-label={t('map.pin', { name: organization.name, category: categoryById(category).label })}
      aria-pressed={selected}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(charity.id)
      }}
    >
      <CategoryBadge
        category={category}
        surface="pin"
        size={selected ? 'lg' : 'md'}
        className={cn(
          'border-[3px] border-(--surface-raised) shadow-(--shadow-card) transition-[width,height] duration-200',
          selected && 'shadow-(--shadow-lifted)',
        )}
      />
    </button>
  )
}

/** A cluster: a soft bubble with how many charities it holds. Zooms in on click. */
export const ClusterPin = ({ count, onZoom }: { count: number; onZoom: () => void }) => {
  const { t } = useTranslation('map')
  const size = count < 10 ? 'h-11 w-11' : count < 50 ? 'h-13 w-13' : 'h-15 w-15'

  return (
    <button
      type="button"
      className={cn(PIN, 'group')}
      aria-label={t('map.cluster', { count })}
      onClick={(event) => {
        event.stopPropagation()
        onZoom()
      }}
    >
      <span
        aria-hidden="true"
        className={cn(
          size,
          'flex items-center justify-center rounded-full font-semibold tabular-nums',
          'bg-(--fill-accent) text-(--text-on-accent) shadow-(--shadow-card)',
          'ring-4 ring-(--surface-raised)/70 transition-shadow group-hover:shadow-(--shadow-lifted)',
        )}
      >
        {count}
      </span>
    </button>
  )
}
