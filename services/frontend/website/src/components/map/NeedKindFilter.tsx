import { useCallback, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { NEED_KINDS, type NeedKindId } from '@shared/catalog'
import { cn } from '@/lib/cn'
import { toggleKind } from '@/lib/need-kinds'
import type { NeedKindCount } from '@/lib/snapshot'
import { Icon } from '@/components/ui/Icon'
import { GLASS, PILL } from './chrome/pill'
import { useDismiss } from './chrome/useDismiss'

const ORDER: readonly NeedKindId[] = NEED_KINDS.map((k) => k.id)
const OFF = cn(GLASS, 'border-(--border-subtle) text-(--text-primary) hover:border-(--border-strong) hover:bg-(--surface-raised)/90')
const ON = 'border-(--ring-accent) bg-(--surface-accent-soft) text-(--text-primary) shadow-(--shadow-card)'

/**
 * "Ko vajag": a pill beside the category chips that opens a short list of
 * need kinds with check boxes. Any number may be ticked; an organisation
 * matches when any one of its needs is of a ticked kind. "Visas vajadzības"
 * clears them. Closes on Escape (focus back to the pill) and on a press
 * outside it.
 */
export const NeedKindFilter = ({
  counts,
  value,
  onChange,
}: {
  counts: readonly NeedKindCount[]
  value: readonly NeedKindId[]
  onChange: (next: readonly NeedKindId[]) => void
}) => {
  const { t } = useTranslation('map')
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, root, button, close)

  const countOf = (id: NeedKindId) => counts.find((c) => c.id === id)?.count ?? 0
  const chosen = value.length

  return (
    <div ref={root} className="pointer-events-auto relative shrink-0">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={chosen > 0 ? t('needs.chosen', { count: chosen }) : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(PILL, 'gap-1.5 px-3.5', chosen > 0 ? ON : OFF)}
      >
        {t('needs.button')}
        {chosen > 0 && (
          <span aria-hidden="true" className="rounded-full bg-(--fill-accent) px-2 text-(length:--text-xs) leading-5 text-(--text-on-accent) tabular-nums">
            {chosen}
          </span>
        )}
        <Icon name="chevronDown" className={cn('text-(length:--text-base) transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={t('needs.label')}
          className="absolute top-full left-0 z-10 mt-2 w-80 max-w-[calc(100vw-1.5rem)] rounded-(--radius-xl) border border-(--border-subtle) bg-(--surface-raised)/95 p-2 shadow-(--shadow-lifted) backdrop-blur-md"
        >
          <button
            type="button"
            aria-pressed={chosen === 0}
            onClick={() => onChange([])}
            className={cn(
              'flex min-h-11 w-full items-center gap-3 rounded-(--radius-md) px-3 text-left text-(length:--text-sm) font-medium',
              'hover:bg-(--surface-sunken) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring-accent)',
              chosen === 0 ? 'text-(--text-accent)' : 'text-(--text-primary)',
            )}
          >
            <Icon name="check" className={cn('text-(length:--text-base)', chosen > 0 && 'invisible')} />
            {t('needs.all')}
          </button>
          <div className="my-1 border-t border-(--border-subtle)" />
          <ul className="max-h-[min(30rem,62vh)] overflow-y-auto overscroll-contain">
            {NEED_KINDS.map((kind) => (
              <li key={kind.id}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-(--radius-md) px-3 text-(length:--text-sm) text-(--text-primary) hover:bg-(--surface-sunken)">
                  <input
                    type="checkbox"
                    checked={value.includes(kind.id)}
                    onChange={() => onChange(toggleKind(value, kind.id, ORDER))}
                    className="h-5 w-5 shrink-0 accent-(--fill-accent)"
                  />
                  <span className="flex-1">{kind.label}</span>
                  <span className="text-(length:--text-xs) text-(--text-secondary) tabular-nums">{countOf(kind.id)}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
