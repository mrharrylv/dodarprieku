import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/cn'
import { DECK_SECTIONS, panelId } from './sections'
import type { DeckSection } from './sections'

/**
 * Where you are in the deck, and a way to jump.
 *
 * The dots are small but each button is a 44px target, because a 10px dot is
 * not something a thumb can hit. Hidden below sm: there is no room for a lane
 * down the side of a phone, and the deck reads fine as a plain scroll.
 *
 * Deliberately NOT a navigation landmark. The home page already carries two,
 * the header's and the footer's, and the only names this project has for a
 * third would describe something else ("Home", "Breadcrumb"): a landmark named
 * wrongly sends a screen reader user to the wrong place, which is worse than
 * no landmark at all. The buttons carry their own names instead, taken from
 * the headings of the panels they jump to, and the current one carries
 * aria-current. If a "Sections" string is ever added to all three locales,
 * this can become a labelled <nav> again.
 */
export const SectionDots = () => {
  const { t } = useTranslation('home')
  const { t: tc } = useTranslation('common')
  const [active, setActive] = useState<DeckSection>('hero')

  useEffect(() => {
    // An observer, not a scroll listener: the browser reports the crossing and
    // there is nothing to throttle. The margins leave a band across the middle
    // of the viewport, so the dot changes when a panel actually owns the screen
    // rather than when its top edge appears.
    if (typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        const centred = entries.find((entry) => entry.isIntersecting)
        if (!centred) return

        const section = DECK_SECTIONS.find((name) => panelId(name) === centred.target.id)
        if (section) setActive(section)
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )

    DECK_SECTIONS.forEach((section) => {
      const panel = document.getElementById(panelId(section))
      if (panel) observer.observe(panel)
    })

    return () => observer.disconnect()
  }, [])

  // Each dot needs a name a screen reader can announce, and the only honest
  // names are the headings the panels already carry.
  const labels: Record<DeckSection, string> = {
    hero: tc('nav.home'),
    highlights: t('highlights.title'),
    services: t('services.title'),
    about: t('about.title'),
    contact: t('cta.title'),
  }

  return (
    <div className="fixed right-2 top-1/2 z-40 hidden -translate-y-1/2 flex-col rounded-(--radius-xl) border border-(--border-subtle) bg-(--surface-raised)/75 p-1 backdrop-blur sm:flex">
      {DECK_SECTIONS.map((section) => {
        const isActive = section === active

        return (
          <button
            key={section}
            type="button"
            onClick={() => scrollToPanel(section)}
            aria-current={isActive ? 'true' : undefined}
            className="group flex h-11 w-11 items-center justify-center rounded-(--radius-lg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring-accent)"
          >
            <span className="sr-only">{labels[section]}</span>
            <span
              aria-hidden="true"
              className={cn(
                'block rounded-full transition-all duration-200 ease-(--ease-out-soft)',
                isActive
                  ? 'h-3 w-3 bg-(--fill-accent)'
                  : 'h-2 w-2 bg-(--border-strong) group-hover:bg-(--text-secondary)',
              )}
            />
          </button>
        )
      })}
    </div>
  )
}

const scrollToPanel = (section: DeckSection) => {
  // No behaviour argument on purpose: the CSS scroll-behavior in tokens.css
  // decides, and it is switched off under prefers-reduced-motion. The optional
  // call keeps a DOM without scrollIntoView (jsdom, in tests) from throwing.
  document.getElementById(panelId(section))?.scrollIntoView?.({ block: 'start' })
}
