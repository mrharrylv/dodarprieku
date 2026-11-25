import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { Seo } from '@/components/seo/Seo'
import { BrandMark } from '@/components/layout/BrandMark'
import { RegisterButton } from '@/components/layout/RegisterButton'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Icon } from '@/components/ui/Icon'
import { DonorSteps, Institutions, OtherProjectsSection, Principles } from './AboutSections'

/**
 * "Par projektu", the map's info page: what Dod ar prieku is and how a donor
 * uses it, how an institution joins, how it is run, and HA Group's other
 * projects. The rail on the map links here.
 */
export const AboutPage = () => {
  const { t } = useTranslation('about')
  const { locale } = useLocale()
  const map = localePath(ROUTES.home, locale)

  return (
    <>
      <Seo title={t('meta.title')} description={t('meta.description')} path={ROUTES.about} locale={locale} />

      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-(--surface-accent-soft) opacity-70 blur-3xl" />
        <Container className="relative grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="text-(length:--text-sm) font-semibold tracking-wide text-(--text-accent) uppercase">{t('eyebrow')}</p>
            <h1 className="mt-3 max-w-3xl text-(length:--text-4xl) leading-tight text-(--text-primary)">{t('title')}</h1>
            <p className="mt-5 max-w-2xl text-(length:--text-lg) text-(--text-secondary)">{t('lead')}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <RegisterButton size="lg" />
              <Link to={map} className="inline-flex min-h-11 items-center gap-2 font-medium text-(--text-accent) underline-offset-4 hover:underline">
                <Icon name="pin" />
                {t('backToMap')}
              </Link>
            </div>
          </div>
          <div aria-hidden="true" className="hidden h-56 w-56 items-center justify-center rounded-full bg-(--surface-raised) shadow-(--shadow-lifted) lg:flex">
            <BrandMark className="h-32 w-32" />
          </div>
        </Container>
      </section>

      <DonorSteps />
      <Institutions />
      <Principles />
      <OtherProjectsSection />

      <Container className="pb-16 sm:pb-24">
        <ButtonLink to={map} variant="ghost">
          <Icon name="arrowRight" className="rotate-180" />
          {t('backToMap')}
        </ButtonLink>
      </Container>
    </>
  )
}
