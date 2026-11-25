import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { PROCESS_STEPS, SERVICES } from '@/data/services'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'

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

      <Container className="py-16 sm:py-24">
        <h1 className="max-w-3xl text-(length:--text-4xl) text-(--text-primary)">
          {t('hero.title')}
        </h1>
        <p className="mt-5 max-w-2xl text-(length:--text-lg) text-(--text-secondary)">
          {t('hero.subtitle')}
        </p>
      </Container>

      <Section tone="sunken">
        <ul className="grid gap-6 lg:grid-cols-2">
          {SERVICES.map((service) => (
            // scroll-mt clears the sticky header when the anchor is followed
            // from the home page; without it the heading lands underneath it.
            <li key={service.key} id={service.slug} className="scroll-mt-24">
              <Card className="h-full">
                <h2 className="text-(length:--text-2xl) text-(--text-primary)">
                  {t(`items.${service.key}.title`)}
                </h2>
                <p className="mt-2 text-(length:--text-lg) text-(--text-accent)">
                  {t(`items.${service.key}.summary`)}
                </p>
                <p className="mt-4 text-(--text-secondary)">
                  {t(`items.${service.key}.body`)}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t('process.title')}>
        <ol className="grid gap-5 sm:grid-cols-3">
          {PROCESS_STEPS.map((step, index) => (
            <li key={step}>
              <Card className="h-full">
                <span
                  aria-hidden="true"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-(--fill-accent) font-(family-name:--font-display) text-(length:--text-sm) font-semibold text-(--text-on-accent)"
                >
                  {index + 1}
                </span>
                <h3 className="mt-4 text-(length:--text-lg) text-(--text-primary)">
                  {t(`process.steps.${step}.title`)}
                </h3>
                <p className="mt-2 text-(--text-secondary)">
                  {t(`process.steps.${step}.body`)}
                </p>
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="sunken" align="center" title={t('cta.title')} subtitle={t('cta.body')}>
        <div className="flex justify-center">
          <ButtonLink to={localePath(ROUTES.contact, locale)} size="lg">
            {t('cta.button')}
          </ButtonLink>
        </div>
      </Section>
    </>
  )
}
