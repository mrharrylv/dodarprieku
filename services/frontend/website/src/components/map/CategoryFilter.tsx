import { useEffect, useRef, useState, type RefObject, type WheelEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { categoryById, type CategoryId } from '@shared/catalog'
import { cn } from '@/lib/cn'
import type { CategoryCount } from '@/lib/snapshot'
import { CategoryBadge } from '@/components/icons/CategoryBadge'
import { Icon } from '@/components/ui/Icon'
import { GLASS, PILL, WRAPPING_PILL } from './chrome/pill'
import { useDragScroll } from './useDragScroll'
import './chrome/chrome.css'

const CHIP = cn(PILL, 'gap-2 pr-3.5 pl-1.5')
/**
 * Laid out all at once, a chip keeps the pill's look but may wrap its name
 * onto a second line, so the longest name stays readable on a narrow phone.
 */
const OPEN_CHIP = cn(WRAPPING_PILL, 'gap-2 pr-3.5 pl-1.5')
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
 * Whether the row holds more chips than it shows, followed as it resizes and
 * measured again whenever `content` (what the chips say) changes: the row's
 * box keeps its width while its chips grow or shrink inside it.
 */
const useOverflowing = (row: RefObject<HTMLDivElement | null>, content: string) => {
  const [overflowing, setOverflowing] = useState(false)
  useEffect(() => {
    const element = row.current
    if (element === null) return undefined
    const measure = () => setOverflowing(element.scrollWidth > element.clientWidth + 1)
    measure()
    if (typeof ResizeObserver !== 'function') return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [row, content])
  return overflowing
}

/**
 * Category chips: toggle buttons with the icon, the plural name and how many
 * match, each floating on its own, in one row. When they do not all fit, the
 * row scrolls sideways (a finger, a mouse wheel, or dragging it with the
 * mouse) and fades out at its right edge, where a chevron button lays every
 * chip out at once, wrapped over several lines; pressed again, it folds them
 * back into the row.
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
  const row = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const overflowing = useOverflowing(row, `${total}:${counts.map(({ id, count }) => `${id}=${count}`).join(',')}`)
  const drag = useDragScroll()
  const folded = !expanded
  const chip = folded ? CHIP : OPEN_CHIP
  const choose = (next: CategoryId | null) => {
    onChange(next)
    setExpanded(false)
  }

  return (
    // Open, the list takes a line of its own, the whole width of the bar.
    <div className={cn('flex min-w-0 items-start gap-2', className, expanded && 'basis-full')}>
      <div
        ref={row}
        role="group"
        aria-label={t('filters.label')}
        onWheel={folded ? wheelSideways : undefined}
        {...(folded ? drag : {})}
        className={cn(
          '-mx-1 -my-2 flex min-w-0 flex-1 gap-2 px-1 py-2',
          folded ? 'dp-scroll-x cursor-grab overflow-x-auto overscroll-x-contain select-none active:cursor-grabbing' : 'flex-wrap',
          // The end padding is the fade's whole width (chrome.css), so the last chip scrolls fully clear of it.
          folded && overflowing && 'dp-fade-x pr-18',
        )}
      >
        <button type="button" aria-pressed={value === null} className={cn(chip, 'pl-3.5', value === null ? ON : OFF)} onClick={() => choose(null)}>
          {t('filters.all')}
          <Count value={total} />
        </button>
        {counts.map(({ id, count }) => (
          <button key={id} type="button" aria-pressed={value === id} className={cn(chip, value === id ? ON : OFF)} onClick={() => choose(value === id ? null : id)}>
            <CategoryBadge category={id} size="sm" />
            {categoryById(id).plural}
            <Count value={count} />
          </button>
        ))}
      </div>
      {(overflowing || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? t('filters.fewer') : t('filters.more')}
          title={expanded ? t('filters.fewer') : t('filters.more')}
          onClick={() => setExpanded((open) => !open)}
          className={cn(PILL, OFF, 'w-11 justify-center text-(length:--text-lg)')}
        >
          <Icon name="chevronDown" className={cn('transition-transform duration-200', expanded && 'rotate-180')} />
        </button>
      )}
    </div>
  )
}

const Count = ({ value }: { value: number }) => (
  <span className="rounded-full bg-(--surface-sunken)/80 px-2 text-(length:--text-xs) text-(--text-secondary) tabular-nums">
    {value}
  </span>
)
