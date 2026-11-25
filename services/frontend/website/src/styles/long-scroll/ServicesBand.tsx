import { useTranslation } from 'react-i18next'

import { SERVICES } from '@/data/services'
import { cn } from '@/lib/cn'
import { Reveal } from '@/components/ui/Reveal'
import { Band, BandHeading } from './Band'
import { HEADER_OFFSET, SECTIONS, bandNumber } from './sections'

/**
 * The offer, as full-width rows.
 *
 * Rows rather than a grid of cards, because on a one-page site this band IS
 * the services page: there is nowhere else for a card to lead to. A row gives
 * each service the width to say something, and the reader scans four headings
 * down the left edge instead of hunting across a grid.
 *
 * Each row keeps its slug as an anchor id, so an old `/services#delivery` link
 * from a business card or an email signature still lands in the right place.
 */
export const ServicesBand = ({ index }: { index: number }) => {
  const { t } = useTranslation('services')

  return (
    <Band id={SECTIONS.services}>
      <BandHeading index={index} title={t('hero.title')} lead={t('hero.subtitle')} />

      <ul className="border-t border-(--border-subtle)">
        {SERVICES.map((service, position) => (
          <li
            key={service.key}
            id={service.slug}
            className={cn(HEADER_OFFSET, 'border-b border-(--border-subtle)')}
          >
            <Reveal className="grid gap-6 py-10 sm:py-14 lg:grid-cols-[6rem_1fr_1.2fr] lg:gap-12">
              <span
                aria-hidden="true"
                className="font-(family-name:--font-display) text-(length:--text-sm) font-semibold tabular-nums tracking-[0.2em] text-(--text-muted)"
              >
                {bandNumber(position + 1)}
              </span>

              <div>
                <h3 className="text-(length:--text-3xl) font-semibold tracking-tight text-(--text-primary)">
                  {t(`items.${service.key}.title`)}
                </h3>
                <p className="mt-3 text-(length:--text-lg) text-(--text-accent)">
                  {t(`items.${service.key}.summary`)}
                </p>
              </div>

              <p className="text-(--text-secondary)">
                {t(`items.${service.key}.body`)}
              </p>
            </Reveal>
          </li>
        ))}
      </ul>
    </Band>
  )
}
