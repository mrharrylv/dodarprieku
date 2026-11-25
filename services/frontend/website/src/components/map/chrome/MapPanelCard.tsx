import { useId, type ReactNode, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/cn'
import { Icon } from '@/components/ui/Icon'
import { panelDomId, type PanelId } from './useMapPanels'
import './chrome.css'

/**
 * One floating panel: a card beside the rail on a wide screen, a bottom sheet
 * on a phone. It slides and fades in (`dp-panel` in chrome.css, off under reduced
 * motion), takes focus when it opens and closes with its button or Escape.
 */
export const MapPanelCard = ({
  id,
  title,
  onClose,
  panelRef,
  children,
}: {
  id: PanelId
  title: string
  onClose: () => void
  panelRef: RefObject<HTMLElement | null>
  children: ReactNode
}) => {
  const { t } = useTranslation('map')
  const headingId = useId()

  return (
    <section
      id={panelDomId(id)}
      ref={panelRef}
      aria-labelledby={headingId}
      tabIndex={-1}
      className={cn(
        'dp-panel fixed inset-x-0 bottom-0 z-40 flex max-h-[72dvh] flex-col focus:outline-none',
        'rounded-t-(--radius-2xl) border border-(--border-subtle) bg-(--surface-raised) shadow-(--shadow-lifted)',
        'md:absolute md:inset-x-auto md:top-24 md:bottom-auto md:left-20 md:max-h-[calc(100%-7.5rem)] md:w-[28rem] max-w-full md:rounded-(--radius-xl)',
      )}
    >
      <div aria-hidden="true" className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-(--border-strong) md:hidden" />
      <div className="flex shrink-0 items-center justify-between gap-3 py-2 pr-2 pl-5 md:pt-3">
        <h2 id={headingId} className="text-(length:--text-lg) font-semibold text-(--text-primary)">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('panel.close')}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-(--text-secondary) transition-colors hover:bg-(--surface-sunken) hover:text-(--text-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring-accent)"
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-1 pb-6">{children}</div>
    </section>
  )
}
