import { useEffect, useId, type ReactNode, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/cn'
import { Icon } from '@/components/ui/Icon'
import './dock.css'

/**
 * The large panel docked on the map's right half: registration and the
 * account. On a wide screen it takes half the width (never under 30rem) and
 * the map keeps working beside it: it is not modal, a click on the map does
 * not close it, and the map's padding (`useDockInset`) keeps fly-tos, clusters
 * and the charity card in the visible left part. Below `DOCK_QUERY` it is a
 * full-screen sheet, and the map page marks everything behind it inert. Its X
 * closes it, and so does Escape while focus is inside it. It takes focus when
 * it opens.
 */
export const DockPanel = ({
  title,
  onClose,
  panelRef,
  children,
}: {
  title: string
  onClose: () => void
  panelRef: RefObject<HTMLElement | null>
  children: ReactNode
}) => {
  const { t } = useTranslation('map')
  const headingId = useId()

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true })
  }, [panelRef])

  return (
    <section
      ref={panelRef}
      aria-labelledby={headingId}
      tabIndex={-1}
      data-dock=""
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        // Only the dock: a rail panel open beside it keeps its own Escape.
        event.stopPropagation()
        onClose()
      }}
      className={cn(
        'dp-dock fixed inset-0 z-50 flex flex-col bg-(--surface-raised) text-(--text-primary) focus:outline-none',
        'lg:absolute lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[max(30rem,50%)] lg:border-l lg:border-(--border-subtle) lg:shadow-(--shadow-lifted)',
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-(--border-subtle) py-2 pr-2 pl-5 sm:pl-8">
        <h2 id={headingId} className="font-(family-name:--font-display) text-(length:--text-xl) font-semibold text-(--text-primary)">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('panel.close')}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-(length:--text-lg) text-(--text-secondary) transition-colors hover:bg-(--surface-sunken) hover:text-(--text-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring-accent)"
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-10 sm:px-8">{children}</div>
    </section>
  )
}
