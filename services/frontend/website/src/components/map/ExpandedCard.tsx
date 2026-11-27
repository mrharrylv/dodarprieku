import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { categoryById } from '@shared/catalog'
import type { PublicCharity } from '@shared/contracts'
import { useCharityStats } from '@/hooks/useCharityStats'
import { useCountView } from '@/hooks/useCountView'
import { cn } from '@/lib/cn'
import { isTextEntry } from '@/lib/keyboard'
import { coverUrl, groupNeeds } from '@/lib/snapshot'
import { CategoryBadge } from '@/components/icons/CategoryBadge'
import { PledgeForm, type PledgeOutcome } from '@/components/pledge/PledgeForm'
import { PledgeThanks } from '@/components/pledge/PledgeThanks'
import { CardHeader } from './CardHeader'
import { MapPopupDetails } from './MapPopupDetails'

/** The expanded card's pages: everything about the charity, the pledge form, the thank-you. */
export type CardStep = { readonly kind: 'details' } | { readonly kind: 'pledge' } | { readonly kind: 'thanks'; readonly outcome: PledgeOutcome }

/** The closest element that scrolls the card: the popup card itself, or the phone's sheet. */
const scrollerOf = (element: HTMLElement | null): HTMLElement | null => element?.closest<HTMLElement>('[data-card-scroll]') ?? null

/** Scrolled past the title: the sticky header shows its bar and the name pill. */
const useScrolledPast = (marker: RefObject<HTMLElement | null>, active: boolean): boolean => {
  const [past, setPast] = useState(false)
  useEffect(() => {
    const element = marker.current
    const scroller = scrollerOf(element)
    if (!active || element === null || scroller === null) return undefined
    const check = () => setPast(scroller.scrollTop > element.offsetTop + element.offsetHeight - 56)
    check()
    scroller.addEventListener('scroll', check, { passive: true })
    return () => scroller.removeEventListener('scroll', check)
  }, [marker, active])
  return active && past
}

/**
 * The card expanded: its sticky header (pill, collapse, close) over three
 * steps in the same card. Step 1 is the details; "Es ziedošu" turns it to
 * step 2, the pledge form, with a back arrow; sending it shows step 3, the
 * thank-you. The ticks survive a trip to step 2 and back, Escape included:
 * on step 2, Escape in a field is the field's, and anywhere else it goes back
 * to the details rather than collapsing the card and losing the form. While
 * step 2 is open the card reports it (`onPledging`), so a stray map click
 * does not close it. Mounted only while
 * expanded, so the stats are fetched (and the view counted) only for a
 * charity someone opened.
 */
export const ExpandedCard = ({
  charity,
  detailsId,
  sheet,
  onCollapse,
  onClose,
  onPledging,
}: {
  charity: PublicCharity
  detailsId: string
  sheet: boolean
  onCollapse: () => void
  onClose: () => void
  onPledging?: ((pledging: boolean) => void) | undefined
}) => {
  const { t } = useTranslation('map')
  const { t: tc } = useTranslation('charity')
  const stats = useCharityStats(charity.id)
  useCountView(charity.id)
  const [step, setStep] = useState<CardStep>({ kind: 'details' })
  const [picked, setPicked] = useState<readonly string[]>([])
  const root = useRef<HTMLDivElement>(null)
  const title = useRef<HTMLDivElement>(null)
  const stepHeading = useRef<HTMLHeadingElement>(null)
  const firstStep = useRef(true)
  const scrolled = useScrolledPast(title, step.kind === 'details')
  const { organization, category, address } = charity.profile
  const cover = coverUrl(charity)
  const needs = groupNeeds(charity, tc('needs.other')).flatMap((g) => g.needs)

  // A new step starts at its top, its heading focused; back on the details, at "Es ziedošu".
  useLayoutEffect(() => {
    if (firstStep.current) {
      firstStep.current = false
      return
    }
    const scroller = scrollerOf(root.current)
    if (step.kind !== 'details') {
      if (scroller !== null) scroller.scrollTop = 0
      stepHeading.current?.focus({ preventScroll: true })
    }
  }, [step])

  const pledging = step.kind === 'pledge'
  useEffect(() => {
    onPledging?.(pledging)
  }, [onPledging, pledging])
  // Unmounted (closed with X or collapsed): no pledge is open any more.
  useEffect(() => () => onPledging?.(false), [onPledging])

  const back = { label: tc('pledge.back'), onClick: () => setStep({ kind: 'details' }) }

  // Escape on step 2 never reaches the card's collapse, the sheet or the map.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !pledging) return
    event.preventDefault()
    event.stopPropagation()
    if (!isTextEntry(event.target)) setStep({ kind: 'details' })
  }

  return (
    <div ref={root} id={detailsId} className="dp-card-in" onKeyDown={onKeyDown}>
      <CardHeader
        name={organization.name}
        category={category}
        solid={step.kind !== 'details' || scrolled}
        back={step.kind === 'pledge' ? back : undefined}
        controls={detailsId}
        onCollapse={onCollapse}
        onClose={onClose}
      />
      {step.kind === 'details' ? (
        <>
          {cover !== undefined ? (
            <img src={cover} alt={t('popup.photoAlt', { name: organization.name })} className={cn('w-full bg-(--surface-sunken) object-cover', sheet ? 'h-24' : 'h-32')} referrerPolicy="no-referrer" draggable={false} />
          ) : (
            <div className="flex h-24 w-full items-center justify-center bg-(--surface-sunken)">
              <CategoryBadge category={category} size="lg" />
            </div>
          )}
          <div ref={title} className="px-4 pt-4 pb-3">
            <h2 className="text-(length:--text-xl) leading-snug font-semibold text-(--text-primary)">{organization.name}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-(length:--text-sm) text-(--text-secondary)">
              <CategoryBadge category={category} size="sm" className="h-5 w-5 text-(length:--text-xs)" />
              <span>{categoryById(category).label}</span>
              <span aria-hidden="true">·</span>
              <span>{address.city}</span>
            </p>
          </div>
          <MapPopupDetails charity={charity} stats={stats} picked={picked} onPick={setPicked} onPledge={() => setStep({ kind: 'pledge' })} />
        </>
      ) : (
        <div className="px-4 pt-16 pb-5">
          {/* The thank-you's own title says it all; its heading names the organisation for a screen reader only. */}
          <h2
            ref={stepHeading}
            tabIndex={-1}
            className={cn('mb-4 text-(length:--text-xl) font-semibold text-(--text-primary) focus:outline-none', step.kind === 'thanks' && 'sr-only')}
          >
            {step.kind === 'pledge' ? tc('pledge.title') : organization.name}
          </h2>
          {step.kind === 'pledge' ? (
            <PledgeForm
              charity={charity}
              needs={needs.filter((n) => picked.includes(n.key))}
              allowedKeys={needs.map((n) => n.key)}
              onDone={(outcome) => {
                setPicked([])
                stats.reload()
                setStep({ kind: 'thanks', outcome })
              }}
            />
          ) : (
            <PledgeThanks outcome={step.outcome} onDone={() => setStep({ kind: 'details' })} />
          )}
        </div>
      )}
    </div>
  )
}
