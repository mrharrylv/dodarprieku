import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { LIMITS, type Need } from '@shared/contracts'

import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/cn'
import { CONTROL_CLASS, controlBorder } from './control-styles'
import './needs.css'

/**
 * One need as a tick card. Ticked, it opens to a note ("piem., tikai jauni
 * dvieļi") and an urgent switch. The check mark pops in; reduced motion keeps
 * the state change and drops the movement (Tailwind's motion-safe).
 */
export const NeedCard = ({
  label,
  need,
  onToggle,
  onNote,
  onUrgent,
  noteError,
  disabled = false,
}: {
  label: string
  need: Need | undefined
  onToggle: () => void
  onNote: (note: string) => void
  onUrgent: (urgent: boolean) => void
  noteError?: string | undefined
  disabled?: boolean
}) => {
  const { t } = useTranslation('register')
  const id = useId()
  const ticked = need !== undefined

  return (
    <li
      className={cn(
        'rounded-(--radius-lg) border-2 transition-[border-color,background-color,box-shadow] duration-200 ease-(--ease-out-soft)',
        ticked ? 'border-(--fill-accent) bg-(--surface-accent-soft) shadow-(--shadow-subtle)' : 'border-(--border-subtle) bg-(--surface-raised)',
        need?.urgent === true && 'border-(--color-danger-500)',
      )}
    >
      <label className={cn('flex min-h-14 cursor-pointer items-center gap-3 rounded-(--radius-lg) p-3', 'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-(--ring-accent)', disabled && !ticked && 'cursor-not-allowed opacity-60')}>
        <input type="checkbox" className="sr-only" checked={ticked} disabled={disabled && !ticked} onChange={onToggle} />
        <span aria-hidden="true" className={cn(
          'grid h-6 w-6 shrink-0 place-items-center rounded-(--radius-sm) border-2 transition-colors duration-200',
          ticked ? 'border-(--fill-accent) bg-(--fill-accent) text-(--text-on-accent)' : 'border-(--border-strong) bg-(--surface-raised)',
        )}>
          {ticked && <Icon name="check" className="h-4 w-4 motion-safe:animate-[need-pop_220ms_ease-out]" />}
        </span>
        <span className="min-w-0 flex-1 font-medium text-(--text-primary)">{label}</span>
        {need?.urgent === true && (
          <span aria-hidden="true" className="rounded-full bg-(--color-danger-600) px-2 py-0.5 text-(length:--text-xs) font-medium text-white">
            {t('needs.urgentBadge')}
          </span>
        )}
      </label>

      {ticked && (
        <div className="space-y-3 px-3 pb-3 motion-safe:animate-[need-open_200ms_ease-out]">
          <div>
            <label htmlFor={`${id}-note`} className="sr-only">
              {t('needs.noteLabel', { item: label })}
            </label>
            <input id={`${id}-note`} type="text" value={need.note ?? ''} maxLength={LIMITS.needNote}
              placeholder={t('needs.notePlaceholder')} onChange={(e) => onNote(e.target.value)}
              aria-invalid={noteError !== undefined || undefined}
              aria-describedby={noteError === undefined ? undefined : `${id}-note-error`}
              className={cn(CONTROL_CLASS, controlBorder(noteError !== undefined), 'text-(length:--text-sm) placeholder:text-(--text-muted)')} />
            {noteError !== undefined && (
              <p id={`${id}-note-error`} role="alert" className="mt-1 text-(length:--text-sm) text-(--color-danger-600)">{noteError}</p>
            )}
          </div>
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-(--border-strong) bg-(--surface-raised) px-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-(--ring-accent)">
            <input type="checkbox" checked={need.urgent} onChange={(e) => onUrgent(e.target.checked)}
              aria-label={t('needs.urgentFor', { item: label })}
              className="h-5 w-5 accent-(--color-danger-600)" />
            <span className="text-(length:--text-sm) font-medium text-(--text-primary)">{t('needs.urgent')}</span>
          </label>
        </div>
      )}
    </li>
  )
}
