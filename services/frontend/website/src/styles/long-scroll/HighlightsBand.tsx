import { useTranslation } from 'react-i18next'

import { HIGHLIGHTS } from '@/data/services'
import { Reveal } from '@/components/ui/Reveal'
import { Band, BandHeading } from './Band'
import { SECTIONS, bandNumber } from './sections'

/**
 * Three reasons, as columns under a rule rather than as cards.
 *
 * No card, no border, no shadow: on a page made of bands, a card is a second
 * box inside a box, and three of them in a row is where a long scroll starts
 * looking like a dashboard. A rule and a number carry the same grouping for
 * free.
 */
export const HighlightsBand = ({ index }: { index: number }) => {
  const { t } = useTranslation('home')

  return (
    <Band id={SECTIONS.highlights} tone="sunken">
      <BandHeading
        index={index}
        title={t('highlights.title')}
        lead={t('highlights.subtitle')}
      />

      <ul className="grid gap-x-12 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {HIGHLIGHTS.map((key, position) => (
          <Reveal as="li" key={key} delay={position * 0.06}>
            <span
              aria-hidden="true"
              className="block h-px w-full bg-(--border-strong)"
            />
            <span
              aria-hidden="true"
              className="mt-6 block font-(family-name:--font-display) text-(length:--text-3xl) font-semibold tabular-nums text-(--text-muted)"
            >
              {bandNumber(position + 1)}
            </span>
            <h3 className="mt-5 text-(length:--text-2xl) font-semibold tracking-tight text-(--text-primary)">
              {t(`highlights.items.${key}.title`)}
            </h3>
            <p className="mt-4 text-(--text-secondary)">
              {t(`highlights.items.${key}.body`)}
            </p>
          </Reveal>
        ))}
      </ul>
    </Band>
  )
}
