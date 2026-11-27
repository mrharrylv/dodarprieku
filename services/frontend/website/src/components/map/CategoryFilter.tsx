import type { WheelEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { categoryById, type CategoryId } from '@shared/catalog'
import { cn } from '@/lib/cn'
import type { CategoryCount } from '@/lib/snapshot'
import { CategoryBadge } from '@/components/icons/CategoryBadge'
import { GLASS, PILL } from './chrome/pill'
import './chrome/chrome.css'

const CHIP = cn(PILL, 'gap-2 pr-3.5 pl-1.5')
const OFF = cn(GLASS, 'border-(--border-subtle) text-(--text-primary) hover:border-(--border-strong) hover:bg-(--surface-raised)/90')
const ON = 'border-(--ring-accent) bg-(--surface-accent-soft) text-(--text-primary) shadow-(--shadow-card)'
/** Pixels a line-mode wheel step (Firefox) stands for. */
const WHEEL_LINE_PX = 16

/**
 * A plain mouse wheel has no sideways axis, and the row hides its scrollbar:
 * its vertical turn scrolls the row sideways. A trackpad's sideways swipe is
 * left to the browser.
 */
const wheelSideways = (event: WheelEvent<HTMLDivElement>) => {
  const row = event.currentTarget
  if (row.scrollWidth <= row.clientWidth || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
  const unit = event.deltaMode === 1 ? WHEEL_LINE_PX : event.deltaMode === 2 ? row.clientWidth : 1
  row.scrollLeft += event.deltaY * unit
}

/**
 * Category chips: toggle buttons with the icon, the plural name and how many
 * match, each floating on its own, in one row that scrolls sideways when it
 * does not fit, with a mouse wheel too.
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
    <div role="group" aria-label={t('filters.label')} className={cn('dp-scroll-x flex gap-2 overflow-x-auto overscroll-x-contain', className)} onWheel={wheelSideways}>
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
  <span className="rounded-full bg-(--surface-sunken)/80 px-2 text-(length:--text-xs) text-(--text-secondary) tabular-nums">
    {value}
  </span>
)
