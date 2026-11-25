import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { PROCESS_STEPS, SERVICES } from '@/data/services'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { Band, BandHeading } from './Band'
import { PageIntro } from './PageIntro'

/**
 * A conventional page, in the deck's clothes: a tall opening, then long rows
 * separated by hairlines. The rows are two columns from md up, name on the left
 * and the detail on the right, so a reader skimming for one service reads only
 * the left edge.
 */
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

      <PageIntro
        eyebrow={tc('nav.services')}
        title={t('hero.title')}
        subtitle={t('hero.subtitle')}
      />

      <Band>
        <ul>
          {SERVICES.map((service, index) => (
            // scroll-mt is the header height, the same --paged-header-h the
            // deck uses, so an anchor followed from the home page lands the row
            // under the header instead of behind it. The row's own py-12 is
            // what keeps the heading off the rule.
            <li
              key={service.key}
              id={service.slug}
              className="scroll-mt-(--paged-header-h) border-t border-(--border-subtle) py-12 last:border-b"
            >
              <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
                <div>
                  <span
                    aria-hidden="true"
                    className="block font-(family-name:--font-display) text-(length:--text-sm) font-semibold tracking-[0.2em] text-(--text-accent)"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h2 className="mt-3 text-(length:--text-2xl) font-semibold tracking-tight">
                    {t(`items.${service.key}.title`)}
                  </h2>
                </div>

                <div>
                  <p className="text-(length:--text-lg) text-(--text-accent)">
                    {t(`items.${service.key}.summary`)}
                  </p>
                  <p className="mt-4 text-(--text-secondary)">
                    {t(`items.${service.key}.body`)}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Band>

      <Band tone="sunken">
        <BandHeading title={t('process.title')} />

        <ol className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-0">
          {PROCESS_STEPS.map((step, index) => (
            <li
              key={step}
              className="border-t border-(--border-subtle) pt-8 first:border-t-0 first:pt-0 sm:border-l sm:border-t-0 sm:px-6 sm:pt-0 sm:first:border-l-0 sm:first:pl-0"
            >
              <span
                aria-hidden="true"
                className="block font-(family-name:--font-display) text-(length:--text-2xl) font-semibold text-(--text-accent)"
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-4 text-(length:--text-xl) font-semibold">
                {t(`process.steps.${step}.title`)}
              </h3>
              <p className="mt-3 text-(--text-secondary)">
                {t(`process.steps.${step}.body`)}
              </p>
            </li>
          ))}
        </ol>
      </Band>

      <Band tone="inverted">
        <BandHeading title={t('cta.title')} subtitle={t('cta.body')} tone="inverted" />
        <div className="mt-10 flex justify-center">
          <ButtonLink to={localePath(ROUTES.contact, locale)} size="lg">
            {t('cta.button')}
          </ButtonLink>
        </div>
      </Band>
    </>
  )
}
