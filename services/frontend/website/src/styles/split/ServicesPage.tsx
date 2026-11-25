import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { PROCESS_STEPS, SERVICES } from '@/data/services'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { PageHead } from './PageHead'
import { SplitSection } from './SplitSection'

/** Odd-numbered sections put the heading on the right, so the page zig-zags. */
const flipAt = (index: number): boolean => index % 2 === 1

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

      <PageHead title={t('hero.title')} subtitle={t('hero.subtitle')} />

      {SERVICES.map((service, index) => (
        <SplitSection
          key={service.key}
          // The id is what the home page's service rows link to.
          id={service.slug}
          flip={flipAt(index)}
          tone={flipAt(index) ? 'sunken' : 'page'}
          heading={t(`items.${service.key}.title`)}
          lead={t(`items.${service.key}.summary`)}
        >
          <p className="max-w-xl text-(length:--text-lg) text-(--text-secondary)">
            {t(`items.${service.key}.body`)}
          </p>
        </SplitSection>
      ))}

      {/* The process continues the alternation from wherever the service list
          ended, so adding a fifth service does not break the rhythm. */}
      <SplitSection
        flip={flipAt(SERVICES.length)}
        tone={flipAt(SERVICES.length) ? 'sunken' : 'page'}
        heading={t('process.title')}
      >
        <Reveal as="ol" className="border-t border-(--border-subtle)">
          {PROCESS_STEPS.map((step, index) => (
            <li
              key={step}
              className="grid gap-x-6 gap-y-2 border-b border-(--border-subtle) py-7 sm:grid-cols-[3rem_minmax(0,1fr)]"
            >
              <span
                aria-hidden="true"
                className="font-(family-name:--font-display) text-(length:--text-xl) tabular-nums text-(--text-muted)"
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="break-words font-(family-name:--font-display) text-(length:--text-xl) tracking-tight text-(--text-primary)">
                  {t(`process.steps.${step}.title`)}
                </h3>
                <p className="mt-2 max-w-xl text-(--text-secondary)">
                  {t(`process.steps.${step}.body`)}
                </p>
              </div>
            </li>
          ))}
        </Reveal>
      </SplitSection>

      <SplitSection
        flip={flipAt(SERVICES.length + 1)}
        tone="accent"
        heading={t('cta.title')}
        lead={t('cta.body')}
      >
        <ButtonLink to={localePath(ROUTES.contact, locale)} size="lg">
          {t('cta.button')}
        </ButtonLink>
      </SplitSection>
    </>
  )
}
