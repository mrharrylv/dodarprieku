import { useTranslation } from 'react-i18next'

import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/cn'
import { WIZARD_STEPS } from './wizard-steps'

/**
 * The six steps as a numbered track. A step already reached is a button back
 * to it; the current one carries aria-current="step"; one not reached yet is
 * plain text. On a phone only the numbers show, with the current step's name
 * written out below.
 */
export const WizardProgress = ({
  step,
  furthest,
  onGo,
}: {
  step: number
  furthest: number
  onGo: (step: number) => void
}) => {
  const { t } = useTranslation('register')
  const percent = Math.round((step / (WIZARD_STEPS.length - 1)) * 100)

  return (
    <nav aria-label={t('progress.label')} className="space-y-3">
      <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-(--surface-sunken)">
        <div className="h-full rounded-full bg-(--fill-accent) transition-[width] duration-500 ease-(--ease-out-soft)" style={{ width: `${percent}%` }} />
      </div>
      <ol className="flex justify-between gap-1">
        {WIZARD_STEPS.map((id, index) => {
          const current = index === step
          const done = index < step || (index <= furthest && !current)
          const reachable = index <= furthest && !current
          const label = t(`steps.${id}`)
          const dot = (
            <>
              <span aria-hidden="true" className={cn(
                'grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 text-(length:--text-sm) font-semibold transition-colors duration-200',
                current && 'border-(--fill-accent) bg-(--fill-accent) text-(--text-on-accent)',
                !current && done && 'border-(--fill-accent) bg-(--surface-accent-soft) text-(--text-accent)',
                !current && !done && 'border-(--border-strong) bg-(--surface-raised) text-(--text-muted)',
              )}>
                {done && !current ? <Icon name="check" className="h-4 w-4" /> : index + 1}
              </span>
              <span aria-hidden="true" className={cn('hidden text-(length:--text-xs) leading-tight lg:block', current ? 'font-semibold text-(--text-primary)' : 'text-(--text-secondary)')}>
                {label}
              </span>
              <span className="sr-only">
                {t('progress.stepOf', { n: index + 1, total: WIZARD_STEPS.length, name: label })}
                {done && !current ? `, ${t('progress.done')}` : ''}
              </span>
            </>
          )
          return (
            <li key={id} className="flex min-w-0 flex-1 justify-center" aria-current={current ? 'step' : undefined}>
              {reachable ? (
                <button type="button" onClick={() => onGo(index)}
                  className="flex min-h-11 min-w-11 flex-col items-center gap-1.5 rounded-(--radius-md) p-1 text-center hover:text-(--text-accent)">
                  {dot}
                </button>
              ) : (
                <span className="flex min-h-11 min-w-11 flex-col items-center gap-1.5 p-1 text-center">{dot}</span>
              )}
            </li>
          )
        })}
      </ol>
      <p className="text-center text-(length:--text-sm) text-(--text-secondary) lg:hidden" aria-hidden="true">
        {t('progress.stepOf', { n: step + 1, total: WIZARD_STEPS.length, name: t(`steps.${WIZARD_STEPS[step] ?? 'review'}`) })}
      </p>
    </nav>
  )
}
