import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { HIGHLIGHTS, SERVICES } from '@/data/services'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { Card, CardLink } from '@/components/ui/Card'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'

export const HomePage = () => {
  const { t } = useTranslation('home')
  const { t: tc } = useTranslation('common')
  const { t: ts } = useTranslation('services')
  const { locale } = useLocale()

  return (
    <>
      <Seo
        title={t('meta.title')}
        description={t('meta.description')}
        path={ROUTES.home}
        locale={locale}
      />

      {/* Hero: the page's only <h1>. */}
      <section className="relative overflow-hidden border-b border-(--border-subtle)">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-(--color-brand-50) to-transparent opacity-70 dark:from-(--color-brand-950) dark:opacity-40"
        />
        <Container className="relative py-20 sm:py-28 lg:py-36">
          <p className="text-(length:--text-sm) font-medium uppercase tracking-[0.14em] text-(--text-accent)">
            {t('hero.eyebrow')}
          </p>
          <h1 className="mt-4 max-w-3xl text-(length:--text-5xl) text-(--text-primary)">
            {t('hero.title')}
          </h1>
          <p className="mt-6 max-w-2xl text-(length:--text-lg) text-(--text-secondary)">
            {t('hero.subtitle')}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink to={localePath(ROUTES.contact, locale)} size="lg">
              {t('hero.primaryCta')}
            </ButtonLink>
            <ButtonLink
              to={localePath(ROUTES.services, locale)}
              size="lg"
              variant="secondary"
            >
              {t('hero.secondaryCta')}
            </ButtonLink>
          </div>
        </Container>
      </section>

      <Section title={t('highlights.title')} subtitle={t('highlights.subtitle')}>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {HIGHLIGHTS.map((key) => (
            <li key={key}>
              <Card className="h-full">
                <h3 className="text-(length:--text-xl) text-(--text-primary)">
                  {t(`highlights.items.${key}.title`)}
                </h3>
                <p className="mt-3 text-(--text-secondary)">
                  {t(`highlights.items.${key}.body`)}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        tone="sunken"
        title={t('services.title')}
        subtitle={t('services.subtitle')}
      >
        <ul className="grid gap-5 sm:grid-cols-2">
          {SERVICES.map((service) => (
            <li key={service.key}>
              <CardLink
                to={`${localePath(ROUTES.services, locale)}#${service.slug}`}
                title={ts(`items.${service.key}.title`)}
                className="h-full"
              >
                {ts(`items.${service.key}.summary`)}
              </CardLink>
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <ButtonLink to={localePath(ROUTES.services, locale)} variant="secondary">
            {t('services.cta')}
          </ButtonLink>
        </div>
      </Section>

      <Section>
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-(length:--text-3xl) text-(--text-primary)">
              {t('about.title')}
            </h2>
            <p className="mt-5 text-(length:--text-lg) text-(--text-secondary)">
              {t('about.body')}
            </p>
            <div className="mt-7">
              <ButtonLink to={localePath(ROUTES.about, locale)} variant="secondary">
                {t('about.cta')}
              </ButtonLink>
            </div>
          </div>

          <Card className="bg-(--surface-sunken)">
            <h3 className="text-(length:--text-2xl) text-(--text-primary)">
              {t('cta.title')}
            </h3>
            <p className="mt-3 text-(--text-secondary)">{t('cta.body')}</p>
            <div className="mt-6">
              <ButtonLink to={localePath(ROUTES.contact, locale)}>
                {tc('cta.contactUs')}
              </ButtonLink>
            </div>
          </Card>
        </div>
      </Section>
    </>
  )
}
