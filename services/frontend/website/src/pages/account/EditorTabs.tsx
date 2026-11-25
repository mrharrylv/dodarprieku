import { useRef, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { PROFILE_SECTIONS, type ProfileSection } from '@/components/profile-editor/sections'
import { cn } from '@/lib/cn'

/**
 * The editor's tab list (WAI-ARIA tabs pattern): one tab stop, arrow keys,
 * Home and End move between tabs. A tab with problems carries a marker and
 * says so to a screen reader.
 */
export const EditorTabs = ({
  active,
  onSelect,
  withErrors,
  idPrefix,
}: {
  active: ProfileSection
  onSelect: (section: ProfileSection) => void
  withErrors: readonly ProfileSection[]
  idPrefix: string
}) => {
  const { t } = useTranslation('account')
  const refs = useRef<Partial<Record<ProfileSection, HTMLButtonElement | null>>>({})

  const move = (event: KeyboardEvent, index: number) => {
    const last = PROFILE_SECTIONS.length - 1
    const target =
      event.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
        : event.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
          : event.key === 'Home' ? 0
            : event.key === 'End' ? last
              : null
    if (target === null) return
    event.preventDefault()
    const section = PROFILE_SECTIONS[target] as ProfileSection
    onSelect(section)
    refs.current[section]?.focus()
  }

  return (
    <div role="tablist" aria-label={t('editor.tabsLabel')} className="-mx-1 flex gap-1 overflow-x-auto border-b border-(--border-subtle) px-1">
      {PROFILE_SECTIONS.map((section, index) => {
        const selected = section === active
        const bad = withErrors.includes(section)
        return (
          <button
            key={section}
            ref={(el) => {
              refs.current[section] = el
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${section}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(section)}
            onKeyDown={(e) => move(e, index)}
            className={cn(
              'relative min-h-11 shrink-0 rounded-t-(--radius-md) border-b-2 px-4 py-2 font-medium whitespace-nowrap',
              selected ? 'border-(--fill-accent) text-(--text-accent)' : 'border-transparent text-(--text-secondary) hover:text-(--text-primary)',
            )}
          >
            {t(`editor.tabs.${section}`)}
            {bad && (
              <>
                <span aria-hidden="true" className="ml-1.5 inline-block h-2 w-2 rounded-full bg-(--color-danger-500) align-middle" />
                <span className="sr-only">{t('editor.tabHasErrors')}</span>
              </>
            )}
          </button>
        )
      })}
    </div>
  )
}
