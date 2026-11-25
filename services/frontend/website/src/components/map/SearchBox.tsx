import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { Icon } from '@/components/ui/Icon'

/** Search by name or city. Filters as the visitor types; there is nothing to submit. */
export const SearchBox = ({ value, onChange, className }: { value: string; onChange: (next: string) => void; className?: string }) => {
  const { t } = useTranslation('map')
  const id = useId()

  return (
    <div role="search" className={className}>
      <label htmlFor={id} className="sr-only">
        {t('search.label')}
      </label>
      <div className="relative">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-(--text-muted)">
          <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4 4" />
        </svg>
        <input
          id={id}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t('search.placeholder')}
          autoComplete="off"
          className="min-h-11 w-full rounded-full border border-(--border-strong) bg-(--surface-page) py-2.5 pr-12 pl-11 text-(--text-primary) placeholder:text-(--text-muted) focus:border-(--ring-accent) focus:outline-none focus:ring-2 focus:ring-(--ring-accent)/30 [&::-webkit-search-cancel-button]:hidden"
        />
        {value !== '' && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label={t('search.clear')}
            className="absolute top-1/2 right-0.5 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-(--text-muted) hover:text-(--text-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring-accent)"
          >
            <Icon name="close" />
          </button>
        )}
      </div>
    </div>
  )
}
