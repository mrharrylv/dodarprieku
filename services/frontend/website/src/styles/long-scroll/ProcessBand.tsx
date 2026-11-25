import { useTranslation } from 'react-i18next'

import { PROCESS_STEPS } from '@/data/services'
import { Reveal } from '@/components/ui/Reveal'
import { Band, BandHeading } from './Band'
import { SECTIONS, bandNumber } from './sections'

/**
 * What happens after somebody gets in touch.
 *
 * Columns divided by a rule rather than boxed as cards, so the three steps
 * read as one sequence instead of three options. The divider flips from
 * horizontal to vertical at `sm`, which is also where the columns appear.
 */
export const ProcessBand = ({ index }: { index: number }) => {
  const { t } = useTranslation('services')

  return (
    <Band id={SECTIONS.process}>
      <BandHeading index={index} title={t('process.title')} />

      <ol className="grid divide-y divide-(--border-subtle) border-y border-(--border-subtle) sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {PROCESS_STEPS.map((step, position) => (
          <Reveal
            as="li"
            key={step}
            delay={position * 0.08}
            className="px-0 py-10 sm:px-8 sm:py-14 sm:first:pl-0 sm:last:pr-0"
          >
            <span
              aria-hidden="true"
              className="block font-(family-name:--font-display) text-(length:--text-4xl) font-semibold tabular-nums text-(--text-accent)"
            >
              {bandNumber(position + 1)}
            </span>
            <h3 className="mt-6 text-(length:--text-xl) font-semibold tracking-tight text-(--text-primary)">
              {t(`process.steps.${step}.title`)}
            </h3>
            <p className="mt-3 text-(--text-secondary)">
              {t(`process.steps.${step}.body`)}
            </p>
          </Reveal>
        ))}
      </ol>
    </Band>
  )
}
