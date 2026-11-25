import { useEffect, useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { categoryById } from '@shared/catalog'
import type { PublicCharity } from '@shared/contracts'
import { cn } from '@/lib/cn'
import { coverUrl, topNeeds } from '@/lib/snapshot'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { CategoryBadge } from '@/components/icons/CategoryBadge'
import { UrgentBadge } from '@/components/charity/UrgentBadge'
import { MapPopupDetails } from './MapPopupDetails'

const ROUND = cn(
  'flex h-11 w-11 items-center justify-center rounded-full bg-(--surface-raised)/90 text-(--text-primary) shadow-(--shadow-card) backdrop-blur-sm',
  'hover:bg-(--surface-raised) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring-accent)',
)

/**
 * What a pin opens: the cover, name, category, city and three needs. "Skatīt
 * vajadzības" expands the same card in place (it grows upwards from the pin,
 * its height animated) into every need with its note and live pledge count,
 * "Es ziedošu", the delivery options and the contacts. On a phone the
 * expanded card is a bottom sheet (`sheet`).
 */
/** A button of the card that should take focus once it is on screen. */
export type CardFocus = 'collapse' | 'view'

export const MapPopupCard = ({
  charity,
  expanded,
  sheet = false,
  focusTarget = null,
  onFocused,
  onExpand,
  onCollapse,
  onClose,
}: {
  charity: PublicCharity
  expanded: boolean
  sheet?: boolean
  /** Set when the card has just expanded or collapsed: focus follows, so it never falls back to the page. */
  focusTarget?: CardFocus | null
  onFocused?: () => void
  onExpand: () => void
  onCollapse: () => void
  onClose: () => void
}) => {
  const { t } = useTranslation('map')
  const ref = useRef<HTMLElement>(null)
  const detailsId = useId()
  const { organization, category, address } = charity.profile
  const cover = coverUrl(charity)
  const needs = topNeeds(charity, 3)

  // A wheel over the card scrolls the card, not the map underneath it.
  useEffect(() => {
    const element = ref.current
    if (element === null) return undefined
    const stop = (event: Event) => event.stopPropagation()
    element.addEventListener('wheel', stop, { passive: true })
    return () => element.removeEventListener('wheel', stop)
  }, [])

  useEffect(() => {
    const button = focusTarget === null ? null : ref.current?.querySelector<HTMLElement>(`[data-focus="${focusTarget}"]`)
    if (button === null || button === undefined) return
    button.focus({ preventScroll: true })
    onFocused?.()
  }, [focusTarget, expanded, onFocused])

  return (
    <article
      ref={ref}
      aria-label={organization.name}
      className={cn(
        'dp-card overscroll-contain',
        sheet ? 'w-full' : 'overflow-y-auto',
        !sheet && (expanded ? 'w-[26rem] max-w-full max-h-[calc(100dvh-10rem)]' : 'w-72'),
      )}
    >
      <div className="relative">
        {cover !== undefined ? (
          <img
            src={cover}
            alt={t('popup.photoAlt', { name: organization.name })}
            className={cn('w-full bg-(--surface-sunken) object-cover', expanded ? (sheet ? 'h-24' : 'h-28') : 'aspect-[16/9]')}
            referrerPolicy="no-referrer"
            draggable={false}
          />
        ) : (
          <div className={cn('flex w-full items-center justify-center bg-(--surface-sunken)', expanded ? 'h-20' : 'aspect-[16/9]')}>
            <CategoryBadge category={category} size="lg" />
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-2">
          {expanded && (
            <button type="button" data-focus="collapse" onClick={onCollapse} aria-label={t('popup.collapse')} aria-controls={detailsId} className={ROUND}>
              <Icon name="chevronDown" />
            </button>
          )}
          <button type="button" onClick={onClose} aria-label={t('popup.close')} className={ROUND}>
            <Icon name="close" />
          </button>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <h2 className="text-(length:--text-lg) leading-snug font-semibold text-(--text-primary)">{organization.name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-(length:--text-sm) text-(--text-secondary)">
            <CategoryBadge category={category} size="sm" className="h-5 w-5 text-(length:--text-xs)" />
            <span>{categoryById(category).label}</span>
            <span aria-hidden="true">·</span>
            <span>{address.city}</span>
          </p>
        </div>
        {!expanded && <NeedsPreview needs={needs} />}
        {!expanded && (
          <Button size="sm" className="w-full" data-focus="view" onClick={onExpand} aria-expanded={false} aria-controls={detailsId}>
            {t('popup.view')}
            <Icon name="chevronDown" />
          </Button>
        )}
      </div>
      <div id={detailsId} className="dp-card-grow grid" data-open={expanded}>
        <div className="min-h-0 overflow-hidden">{expanded && <MapPopupDetails charity={charity} />}</div>
      </div>
    </article>
  )
}

const NeedsPreview = ({ needs }: { needs: ReturnType<typeof topNeeds> }) => {
  const { t } = useTranslation('map')
  if (needs.length === 0) {
    return (
      <div className="rounded-(--radius-md) bg-(--surface-sunken) px-3 py-2.5 text-(length:--text-sm)">
        <p className="font-medium text-(--text-primary)">{t('popup.noNeeds')}</p>
        <p className="mt-0.5 text-(--text-secondary)">{t('popup.noNeedsHint')}</p>
      </div>
    )
  }
  return (
    <ul className="space-y-1.5 text-(length:--text-sm) text-(--text-primary)">
      {needs.map((need) => (
        <li key={need.key} className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate">{need.label}</span>
          {need.urgent && <UrgentBadge label={t('popup.urgent')} />}
        </li>
      ))}
    </ul>
  )
}
