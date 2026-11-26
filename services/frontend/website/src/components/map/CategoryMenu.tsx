import { useCallback, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { categoryById, type CategoryId } from '@shared/catalog'
import { cn } from '@/lib/cn'
import type { CategoryCount } from '@/lib/snapshot'
import { CategoryBadge } from '@/components/icons/CategoryBadge'
import { Icon } from '@/components/ui/Icon'
import { GLASS, PILL } from './chrome/pill'
import { useDismiss } from './chrome/useDismiss'

const OFF = cn(GLASS, 'border-(--border-subtle) text-(--text-primary) hover:border-(--border-strong) hover:bg-(--surface-raised)/90')
const ON = 'border-(--ring-accent) bg-(--surface-accent-soft) text-(--text-primary) shadow-(--shadow-card)'
const ROW = cn(
  'flex min-h-11 w-full items-center gap-3 rounded-(--radius-md) px-2.5 text-left text-(length:--text-sm)',
  'hover:bg-(--surface-sunken) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring-accent)',
)

/**
 * The category chips folded into one pill, styled like "Ko vajag": what the
 * top bar shows while a panel is docked and the chips would not fit. It
 * names the chosen category (with its icon), and opens the same choices as a
 * list with icons and counts, under the bar's left edge so it stays clear of
 * the dock. Choosing one closes it.
 */
export const CategoryMenu = ({
  counts,
  total,
  value,
  onChange,
}: {
  counts: readonly CategoryCount[]
  total: number
  value: CategoryId | null
  onChange: (next: CategoryId | null) => void
}) => {
  const { t } = useTranslation('map')
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, root, button, close)

  const choose = (next: CategoryId | null) => {
    onChange(next)
    setOpen(false)
    button.current?.focus()
  }

  return (
    // Not `relative`: the list hangs from the whole bar's left edge, so it never reaches under the dock.
    <div ref={root} className="pointer-events-auto shrink-0">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={value === null ? t('filters.label') : t('filters.chosen', { name: categoryById(value).plural })}
        onClick={() => setOpen((v) => !v)}
        className={cn(PILL, 'max-w-56 gap-1.5 pr-3.5', value === null ? 'pl-3.5' : 'pl-1.5', value === null ? OFF : ON)}
      >
        {value !== null && <CategoryBadge category={value} size="sm" />}
        <span className="truncate">{value === null ? t('filters.button') : categoryById(value).plural}</span>
        <Icon name="chevronDown" className={cn('shrink-0 text-(length:--text-base) transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={t('filters.label')}
          className="absolute top-full left-0 z-10 mt-2 w-80 max-w-[calc(100vw-1.5rem)] rounded-(--radius-xl) border border-(--border-subtle) bg-(--surface-raised)/95 p-2 shadow-(--shadow-lifted) backdrop-blur-md"
        >
          <ul className="max-h-[min(30rem,62vh)] overflow-y-auto overscroll-contain">
            <li>
              <button type="button" aria-pressed={value === null} onClick={() => choose(null)} className={cn(ROW, value === null ? 'font-semibold text-(--text-accent)' : 'text-(--text-primary)')}>
                <Icon name="check" className={cn('mx-1.5 text-(length:--text-base)', value !== null && 'invisible')} />
                <span className="flex-1">{t('filters.allCategories')}</span>
                <span className="text-(length:--text-xs) text-(--text-secondary) tabular-nums">{total}</span>
              </button>
            </li>
            {counts.map(({ id, count }) => (
              <li key={id}>
                <button type="button" aria-pressed={value === id} onClick={() => choose(id)} className={cn(ROW, value === id ? 'bg-(--surface-accent-soft) font-semibold' : '', 'text-(--text-primary)')}>
                  <CategoryBadge category={id} size="sm" />
                  <span className="flex-1">{categoryById(id).plural}</span>
                  <span className="text-(length:--text-xs) text-(--text-secondary) tabular-nums">{count}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
