import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/cn'
import { Icon } from '@/components/ui/Icon'

/**
 * While any needs on the map were made up (dev's demo-needs task, `make run`),
 * a tiny pill says "Testa vide" at the bottom centre of the visible map, low
 * enough to sit under the pins' usual places and clear of the zoom buttons,
 * the attribution and the phone's two buttons. On a phone the bottom band is
 * the attribution's, with the register and account buttons stacked above it,
 * so the pill sits above them all; it follows a docked panel's edge over the
 * slide's own time and curve; its hit area never leaves the map. It opens into the full
 * sentence. Never shown on production, which has no demo needs.
 */
export const DemoNotice = () => {
  const { t } = useTranslation('map')
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <div
      role="note"
      className="pointer-events-none absolute bottom-[9rem] left-[calc((100%-var(--dock-inset,0px))/2)] z-20 flex -translate-x-1/2 flex-col items-center gap-1 transition-[left] duration-(--dock-motion) ease-(--dock-ease) md:bottom-3"
    >
      {open && (
        <p id={id} className="dp-chrome-in w-max max-w-[min(22rem,calc(100vw-2rem))] rounded-(--radius-md) border border-(--border-subtle) bg-(--surface-raised) px-3 py-2 text-center text-(length:--text-xs) text-(--text-secondary) shadow-(--shadow-card)">
          {t('demo')}
        </p>
      )}
      <button
        type="button"
        aria-expanded={open}
        {...(open ? { 'aria-controls': id } : {})}
        aria-label={t('demoToggle')}
        onClick={() => setOpen((v) => !v)}
        className="group pointer-events-auto -my-2.5 flex min-h-11 items-center px-1 focus-visible:outline-none"
      >
        <span
          className={cn(
            'inline-flex h-6 items-center gap-1 rounded-full border border-(--border-subtle) bg-(--surface-raised)/85 px-2 text-(length:--text-xs) font-medium text-(--text-secondary) shadow-(--shadow-subtle) backdrop-blur-md',
            'group-hover:text-(--text-primary) group-focus-visible:ring-2 group-focus-visible:ring-(--ring-accent)',
          )}
        >
          <Icon name="info" />
          {t('demoShort')}
        </span>
      </button>
    </div>
  )
}
