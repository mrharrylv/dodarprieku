import { useTranslation } from 'react-i18next'

import { categoryById, type CategoryId } from '@shared/catalog'
import type { PublicCharity } from '@shared/contracts'
import { cn } from '@/lib/cn'
import { CategoryBadge } from '@/components/icons/CategoryBadge'
import { clusterSize } from './marker-sync'

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

/** The heart a cluster is drawn as; its count sits inside. */
const HEART = 'M12 21.2s-8.6-5.1-9.9-10.6C1.2 6.8 3.7 3.6 7.1 3.6c2.1 0 3.8 1.1 4.9 2.8 1.1-1.7 2.8-2.8 4.9-2.8 3.4 0 5.9 3.2 5 7-1.3 5.5-9.9 10.6-9.9 10.6Z'

/**
 * A cluster: a small heart in the accent colour with how many charities it
 * holds, growing gently with the count. Zooms in on click. The button is a
 * full 44px target whatever the heart's size.
 */
export const ClusterPin = ({ count, onZoom }: { count: number; onZoom: () => void }) => {
  const { t } = useTranslation('map')
  const size = clusterSize(count)

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
      <span aria-hidden="true" className="dp-heart relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full overflow-visible" focusable="false">
          <path d={HEART} className="fill-(--fill-accent) stroke-(--surface-raised) transition-colors group-hover:fill-(--fill-accent-hover)" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        <span
          className="relative -mt-[8%] font-semibold leading-none text-(--text-on-accent) tabular-nums"
          style={{ fontSize: count >= 100 ? size * 0.3 : size * 0.36 }}
        >
          {count}
        </span>
      </span>
    </button>
  )
}

/**
 * Two or three charities close together: never a lone "2" bubble, but the
 * pin of the category most of them share, with a small count on it.
 */
export const SmallClusterPin = ({ count, category, onZoom }: { count: number; category: CategoryId; onZoom: () => void }) => {
  const { t } = useTranslation('map')

  return (
    <button
      type="button"
      className={PIN}
      aria-label={t('map.cluster', { count })}
      onClick={(event) => {
        event.stopPropagation()
        onZoom()
      }}
    >
      <CategoryBadge category={category} surface="pin" size="md" className="border-[3px] border-(--surface-raised) shadow-(--shadow-card)" />
      <span
        aria-hidden="true"
        className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-(--surface-raised) bg-(--fill-accent) px-1 text-(length:--text-xs) leading-none font-semibold text-(--text-on-accent) tabular-nums shadow-(--shadow-subtle)"
      >
        {count}
      </span>
    </button>
  )
}
