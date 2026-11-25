import { useTranslation } from 'react-i18next'

import { LOCALES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { cn } from '@/lib/cn'

/**
 * Language choice, as a segmented set of buttons.
 *
 * With three languages this beats a dropdown: every option is visible and one
 * tap away, and there is no menu to open on a phone. It is a `radiogroup`
 * rather than a list of links because the choice is a setting with exactly one
 * active value, which is what `aria-checked` conveys.
 *
 * Switching keeps the visitor on the page they were reading; see `useLocale`.
 */
export const LanguageSwitcher = ({ className }: { className?: string }) => {
  const { t } = useTranslation('common')
  const { locale, change } = useLocale()

  if (LOCALES.length < 2) return null

  return (
    <div
      role="radiogroup"
      aria-label={t('language.label')}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-(--radius-md) bg-(--surface-sunken) p-0.5',
        className,
      )}
    >
      {LOCALES.map((entry) => {
        const active = entry.code === locale

        return (
          <button
            key={entry.code}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={t('language.switchTo', { language: entry.label })}
            lang={entry.htmlLang}
            onClick={() => change(entry.code)}
            className={cn(
              'min-h-9 rounded-[calc(var(--radius-md)-2px)] px-2.5 text-(length:--text-sm) font-medium transition-colors',
              active
                ? 'bg-(--surface-raised) text-(--text-primary) shadow-(--shadow-subtle)'
                : 'text-(--text-muted) hover:text-(--text-primary)',
            )}
          >
            {entry.short}
          </button>
        )
      })}
    </div>
  )
}
