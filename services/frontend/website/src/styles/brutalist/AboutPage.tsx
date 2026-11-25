import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { VALUES } from '@/data/services'
import { useLocale } from '@/hooks/useLocale'
import { Seo } from '@/components/seo/Seo'
import { CtaSlab } from './CtaSlab'
import { Hero } from './Hero'
import { LineCell, LineGrid } from './LineGrid'
import { Slab } from './Slab'
import { ordinal } from './marks'

export const AboutPage = () => {
  const { t } = useTranslation('about')
  const { t: tc } = useTranslation('common')
  const { locale } = useLocale()

  return (
    <>
      <Seo
        title={t('meta.title')}
        description={t('meta.description')}
        path={ROUTES.about}
        locale={locale}
      />

      <Hero
        index={ordinal(1)}
        kicker={tc('nav.about')}
        title={t('hero.title')}
        subtitle={t('hero.subtitle')}
      />

      <Slab index={ordinal(2)} title={t('story.title')}>
        {/* Measure, not width: monospace at --text-lg runs out of readability
            well before the 80rem container does. */}
        <p className="max-w-2xl whitespace-pre-line text-(length:--text-lg) text-(--text-secondary)">
          {t('story.body')}
        </p>
      </Slab>

      <Slab index={ordinal(3)} tone="sunken" title={t('values.title')}>
        <LineGrid className="sm:grid-cols-3">
          {VALUES.map((key, index) => (
            <LineCell key={key} index={ordinal(index + 1)}>
              <h3 className="break-words text-(length:--text-lg) font-bold uppercase tracking-[0.02em] text-(--text-primary)">
                {t(`values.items.${key}.title`)}
              </h3>
              <p className="mt-4 text-(--text-secondary)">
                {t(`values.items.${key}.body`)}
              </p>
            </LineCell>
          ))}
        </LineGrid>
      </Slab>

      <CtaSlab
        index={ordinal(4)}
        title={t('cta.title')}
        body={t('cta.body')}
        action={t('cta.button')}
      />
    </>
  )
}
