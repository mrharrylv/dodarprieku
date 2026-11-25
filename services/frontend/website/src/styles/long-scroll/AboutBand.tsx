import { useTranslation } from 'react-i18next'

import { VALUES } from '@/data/services'
import { Reveal } from '@/components/ui/Reveal'
import { Band, BandHeading } from './Band'
import { SECTIONS } from './sections'

/**
 * Who the business is, at reading width.
 *
 * The whole about page folds into one band here, story and values together,
 * because a one-page site has no "more about us" to click. The story column is
 * deliberately narrow: a paragraph of history set across a 1200px band is
 * unreadable, and this is the one part of the page somebody actually reads
 * rather than scans.
 */
export const AboutBand = ({ index }: { index: number }) => {
  const { t } = useTranslation('about')

  return (
    <Band id={SECTIONS.about} tone="sunken">
      <BandHeading index={index} title={t('hero.title')} lead={t('hero.subtitle')} />

      <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
        <Reveal>
          <h3 className="text-(length:--text-2xl) font-semibold tracking-tight text-(--text-primary)">
            {t('story.title')}
          </h3>
          <p className="mt-6 max-w-prose text-(length:--text-lg) text-(--text-secondary)">
            {t('story.body')}
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <h3 className="text-(length:--text-2xl) font-semibold tracking-tight text-(--text-primary)">
            {t('values.title')}
          </h3>

          <ul className="mt-6 border-t border-(--border-subtle)">
            {VALUES.map((key) => (
              <li key={key} className="border-b border-(--border-subtle) py-6">
                <h4 className="text-(length:--text-lg) font-semibold text-(--text-primary)">
                  {t(`values.items.${key}.title`)}
                </h4>
                <p className="mt-2 text-(--text-secondary)">
                  {t(`values.items.${key}.body`)}
                </p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </Band>
  )
}
