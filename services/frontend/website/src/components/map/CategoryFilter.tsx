import { useTranslation } from 'react-i18next'

import { categoryById, type CategoryId } from '@shared/catalog'
import { cn } from '@/lib/cn'
import type { CategoryCount } from '@/lib/snapshot'
import { CategoryBadge } from '@/components/icons/CategoryBadge'
import './chrome/chrome.css'

const CHIP = cn(
  'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border py-1 pr-3.5 pl-1.5',
  'text-(length:--text-sm) font-medium whitespace-nowrap transition-colors duration-150',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring-accent)',
)
const OFF = 'border-(--border-subtle) bg-(--surface-raised) text-(--text-primary) hover:border-(--border-strong)'
const ON = 'border-(--ring-accent) bg-(--surface-accent-soft) text-(--text-primary) shadow-(--shadow-subtle)'

/**
 * Category chips: toggle buttons with the icon, the plural name and how many
 * match, in one row that scrolls sideways when it does not fit.
 */
export const CategoryFilter = ({
  counts,
  total,
  value,
  onChange,
  className,
}: {
  counts: readonly CategoryCount[]
  total: number
  value: CategoryId | null
  onChange: (next: CategoryId | null) => void
  className?: string
}) => {
  const { t } = useTranslation('map')

  return (
    <div role="group" aria-label={t('filters.label')} className={cn('dp-scroll-x flex gap-2 overflow-x-auto overscroll-x-contain', className)}>
      <button type="button" aria-pressed={value === null} className={cn(CHIP, 'pl-3.5', value === null ? ON : OFF)} onClick={() => onChange(null)}>
        {t('filters.all')}
        <Count value={total} />
      </button>
      {counts.map(({ id, count }) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          className={cn(CHIP, value === id ? ON : OFF)}
          onClick={() => onChange(value === id ? null : id)}
        >
          <CategoryBadge category={id} size="sm" />
          {categoryById(id).plural}
          <Count value={count} />
        </button>
      ))}
    </div>
  )
}

const Count = ({ value }: { value: number }) => (
  <span className="rounded-full bg-(--surface-sunken) px-2 text-(length:--text-xs) text-(--text-secondary) tabular-nums">
    {value}
  </span>
)
