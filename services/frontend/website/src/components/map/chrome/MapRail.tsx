import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/cn'
import { Icon, type IconName } from '@/components/ui/Icon'
import { panelDomId, type MapPanels, type PanelId } from './useMapPanels'

const RAIL_PANELS: ReadonlyArray<{ readonly id: PanelId; readonly icon: IconName }> = [
  { id: 'leaderboard', icon: 'trophy' },
  { id: 'news', icon: 'mail' },
  { id: 'info', icon: 'info' },
]

const ROUND = cn(
  'group relative inline-flex items-center justify-center rounded-full border border-(--border-subtle)',
  'bg-(--surface-raised)/95 text-(--text-secondary) shadow-(--shadow-card) backdrop-blur-md',
  'transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-(--ease-out-soft)',
  'hover:-translate-y-px hover:text-(--text-primary) hover:shadow-(--shadow-lifted)',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring-accent)',
)
const ACTIVE = 'border-(--ring-accent) bg-(--surface-accent-soft) text-(--text-accent) hover:text-(--text-accent)'

/**
 * The floating icon rail on the map's left edge: the leaderboard, the
 * newsletter and the project's info, each opening a panel beside it. The
 * account lives on the right, with the other button that opens a dock there
 * (`MapActions`). Every button carries its name as `aria-label` and as a
 * tooltip that shows on hover and on keyboard focus.
 */
export const MapRail = ({ panels }: { panels: MapPanels }) => {
  const { t } = useTranslation('map')

  return (
    <nav aria-label={t('rail.label')} className="absolute top-36 left-3 z-30 flex flex-col gap-2.5 md:left-4 xl:top-24">
      {RAIL_PANELS.map(({ id, icon }) => {
        const open = panels.open === id
        return (
          <button
            key={id}
            ref={panels.buttonRef(id)}
            type="button"
            aria-label={t(`rail.${id}`)}
            aria-expanded={open}
            aria-controls={open ? panelDomId(id) : undefined}
            onClick={() => panels.toggle(id)}
            className={cn(ROUND, 'h-12 w-12 text-(length:--text-lg)', open && ACTIVE)}
          >
            <Icon name={icon} />
            <Tooltip>{t(`rail.${id}`)}</Tooltip>
          </button>
        )
      })}
    </nav>
  )
}

/** The name beside a rail button, on hover or keyboard focus; the button's own label is what is announced. */
const Tooltip = ({ children }: { children: ReactNode }) => (
  <span
    aria-hidden="true"
    className={cn(
      'pointer-events-none absolute top-1/2 left-full ml-3 -translate-x-1 -translate-y-1/2 rounded-(--radius-md) px-2.5 py-1.5',
      'bg-(--surface-inverted) text-(length:--text-sm) font-medium whitespace-nowrap text-(--text-inverted) opacity-0 shadow-(--shadow-card)',
      'transition-[opacity,transform] duration-150 ease-(--ease-out-soft)',
      'group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100',
      'hidden md:block group-aria-expanded:hidden',
    )}
  >
    {children}
  </span>
)
