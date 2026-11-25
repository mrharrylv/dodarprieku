import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { PROCESS_STEPS, SERVICES } from '@/data/services'
import { useLocale } from '@/hooks/useLocale'
import { Seo } from '@/components/seo/Seo'
import { CtaSlab } from './CtaSlab'
import { Hero } from './Hero'
import { LineCell, LineGrid } from './LineGrid'
import { Slab } from './Slab'
import { NUM, ordinal } from './marks'

export const ServicesPage = () => {
  const { t } = useTranslation('services')
  const { t: tc } = useTranslation('common')
  const { locale } = useLocale()

  return (
    <>
      <Seo
        title={t('meta.title')}
        description={t('meta.description')}
        path={ROUTES.services}
        locale={locale}
      />

      <Hero
        index={ordinal(1)}
        kicker={tc('nav.services')}
        title={t('hero.title')}
        subtitle={t('hero.subtitle')}
      />

      {/* No section heading: each service carries its own h2, and inventing a
          second one over the top would push them all down a level. */}
      <Slab index={ordinal(2)}>
        <ul>
          {SERVICES.map((service, index) => (
            <li
              key={service.key}
              id={service.slug}
              className="grid scroll-mt-6 gap-x-6 gap-y-4 border-b-2 border-(--border-subtle) py-8 last:border-b-0 last:pb-0 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.3fr)]"
            >
              <span aria-hidden="true" className={NUM}>
                {ordinal(index + 1)}
              </span>

              <div>
                <h2 className="break-words text-(length:--text-2xl) font-bold uppercase tracking-[0.02em] text-(--text-primary)">
                  {t(`items.${service.key}.title`)}
                </h2>
                <p className="mt-3 text-(length:--text-base) font-bold text-(--text-primary)">
                  {t(`items.${service.key}.summary`)}
                </p>
              </div>

              <p className="text-(--text-secondary)">
                {t(`items.${service.key}.body`)}
              </p>
            </li>
          ))}
        </ul>
      </Slab>

      <Slab index={ordinal(3)} tone="sunken" title={t('process.title')}>
        <LineGrid as="ol" className="sm:grid-cols-3">
          {PROCESS_STEPS.map((step, index) => (
            <LineCell key={step} index={ordinal(index + 1)}>
              <h3 className="break-words text-(length:--text-lg) font-bold uppercase tracking-[0.02em] text-(--text-primary)">
                {t(`process.steps.${step}.title`)}
              </h3>
              <p className="mt-4 text-(--text-secondary)">
                {t(`process.steps.${step}.body`)}
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
