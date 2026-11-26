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
import { CardButton } from './CardHeader'
import { ClaimLink } from './ClaimLink'
import { ExpandedCard } from './ExpandedCard'

/** A button of the card that should take focus once it is on screen. */
export type CardFocus = 'collapse' | 'view'

/**
 * What a pin opens: the cover, name, category, city and three needs. "Skatīt
 * vajadzības" expands the same card in place, wider and taller (it grows
 * upwards from the pin), into its steps: every need with its note and live
 * pledge count, then the pledge form, then the thank-you (`ExpandedCard`).
 * On a phone the expanded card is a bottom sheet (`sheet`). The card itself
 * scrolls (`data-card-scroll`), under its sticky header.
 */
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
      {...(sheet ? {} : { 'data-card-scroll': '' })}
      className={cn(
        'dp-card overscroll-contain',
        sheet ? 'w-full' : 'overflow-y-auto',
        !sheet && (expanded ? 'dp-card-wide max-h-[calc(100dvh-9rem)] max-w-full' : 'w-72'),
      )}
    >
      {expanded ? (
        <ExpandedCard charity={charity} detailsId={detailsId} sheet={sheet} onCollapse={onCollapse} onClose={onClose} />
      ) : (
        <>
          <div className="relative">
            {coverUrl(charity) !== undefined ? (
              <img
                src={coverUrl(charity)}
                alt={t('popup.photoAlt', { name: organization.name })}
                className="aspect-[16/9] w-full bg-(--surface-sunken) object-cover"
                referrerPolicy="no-referrer"
                draggable={false}
              />
            ) : (
              <div className="flex aspect-[16/9] w-full items-center justify-center bg-(--surface-sunken)">
                <CategoryBadge category={category} size="lg" />
              </div>
            )}
            <div className="absolute top-2 right-2">
              <CardButton icon="close" label={t('popup.close')} onClick={onClose} />
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
            <NeedsPreview needs={topNeeds(charity, 3)} />
            <Button size="sm" className="w-full" data-focus="view" onClick={onExpand} aria-expanded={false} aria-controls={detailsId}>
              {t('popup.view')}
              <Icon name="chevronDown" />
            </Button>
            <ClaimLink charity={charity} compact />
          </div>
        </>
      )}
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
