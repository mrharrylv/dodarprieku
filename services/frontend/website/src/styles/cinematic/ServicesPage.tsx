import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { PROCESS_STEPS, SERVICES } from '@/data/services'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { Band } from './Band'
import { Glow } from './Decor'
import { PageHeader } from './PageHeader'
import { Pillars } from './Pillars'

/**
 * Services: one long index, each entry a full width row split into a numeral,
 * a title and the detail. It reads as a contents page, which is the point: a
 * visitor who arrived from the home page anchor lands on the row they clicked
 * and can see the rest of the list above and below it without scrolling back.
 */
export const ServicesPage = () => {
  const { t } = useTranslation('services')
  const { locale } = useLocale()

  return (
    <>
      <Seo
        title={t('meta.title')}
        description={t('meta.description')}
        path={ROUTES.services}
        locale={locale}
      />

      <PageHeader title={t('hero.title')} subtitle={t('hero.subtitle')} />

      <Band tone="sunken">
        <ul className="border-t border-(--border-subtle)">
          {SERVICES.map((service, index) => (
            // scroll-mt clears the sticky header when the anchor is followed
            // from the home page; without it the heading lands underneath it.
            <li
              key={service.key}
              id={service.slug}
              className="scroll-mt-28 border-b border-(--border-subtle)"
            >
              <Reveal
                delay={0.08 + index * 0.1}
                className="grid gap-6 py-12 sm:py-16 lg:grid-cols-[4rem_1fr_1.1fr] lg:gap-12"
              >
                <span
                  aria-hidden="true"
                  className="font-(family-name:--font-display) text-(length:--text-xs) font-semibold uppercase tracking-[0.34em] text-(--text-accent)"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>

                <div>
                  <h2 className="text-(length:--text-3xl) text-(--text-primary)">
                    {t(`items.${service.key}.title`)}
                  </h2>
                  <p className="mt-4 text-(length:--text-lg) text-(--text-accent)">
                    {t(`items.${service.key}.summary`)}
                  </p>
                </div>

                <p className="text-(--text-secondary)">{t(`items.${service.key}.body`)}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </Band>

      <Band title={t('process.title')}>
        <Pillars
          ordered
          items={PROCESS_STEPS.map((step) => ({
            key: step,
            title: t(`process.steps.${step}.title`),
            body: t(`process.steps.${step}.body`),
          }))}
        />
      </Band>

      <Band tone="sunken" align="center" title={t('cta.title')} subtitle={t('cta.body')}>
        <div className="flex justify-center">
          <Glow>
            <ButtonLink
              to={localePath(ROUTES.contact, locale)}
              size="lg"
              className="uppercase tracking-[0.16em]"
            >
              {t('cta.button')}
            </ButtonLink>
          </Glow>
        </div>
      </Band>
    </>
  )
}
