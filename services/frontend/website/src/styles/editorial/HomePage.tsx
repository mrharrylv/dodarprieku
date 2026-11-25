import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { HIGHLIGHTS, SERVICES } from '@/data/services'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Reveal } from '@/components/ui/Reveal'
import { ClosingCta } from './ClosingCta'
import { EntryRow } from './EntryRow'
import { MoreLink } from './MoreLink'
import { NoteGrid } from './NoteGrid'
import { SectionHeading } from './SectionHeading'

/**
 * Home is a cover and a contents page: one statement set as large as the page
 * allows, then a numbered list of what the rest of the site says. A visitor
 * who reads nothing else knows what is on offer and how to start.
 */
export const HomePage = () => {
  const { t } = useTranslation('home')
  const { t: ts } = useTranslation('services')
  const { locale } = useLocale()
  const servicesPath = localePath(ROUTES.services, locale)

  return (
    <>
      <Seo
        title={t('meta.title')}
        description={t('meta.description')}
        path={ROUTES.home}
        locale={locale}
      />

      {/* The statement. The page's only h1, and the only thing above the fold
          on a phone besides the masthead. */}
      <section className="border-b border-(--border-subtle)">
        <Container className="py-14 sm:py-20 lg:py-28">
          <div className="flex items-center gap-4">
            <p className="text-(length:--text-xs) uppercase tracking-[0.24em] text-(--text-muted)">
              {t('hero.eyebrow')}
            </p>
            <span aria-hidden="true" className="h-px flex-1 bg-(--border-subtle)" />
          </div>

          <h1 className="animate-rise-in mt-8 max-w-[16ch] break-words font-(family-name:--font-display) text-(length:--text-5xl) font-semibold leading-[0.98] tracking-[-0.04em] text-(--text-primary) text-balance">
            {t('hero.title')}
          </h1>

          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-end lg:gap-14">
            <p className="max-w-[52ch] text-(length:--text-lg) leading-relaxed text-(--text-secondary)">
              {t('hero.subtitle')}
            </p>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 lg:justify-end">
              <ButtonLink to={localePath(ROUTES.contact, locale)} size="lg">
                {t('hero.primaryCta')}
              </ButtonLink>
              <MoreLink to={servicesPath}>{t('hero.secondaryCta')}</MoreLink>
            </div>
          </div>
        </Container>
      </section>

      {/* The contents list. Each row links to its own entry on the services
          page, so the list is navigation as well as a summary. */}
      <section>
        <Container className="py-12 sm:py-16">
          <SectionHeading title={t('services.title')} subtitle={t('services.subtitle')} />
          <ol className="mt-8">
            {SERVICES.map((service, index) => (
              <EntryRow
                key={service.key}
                index={index}
                title={ts(`items.${service.key}.title`)}
                lead={ts(`items.${service.key}.summary`)}
                to={`${servicesPath}#${service.slug}`}
              />
            ))}
          </ol>
          <div className="mt-6">
            <MoreLink to={servicesPath}>{t('services.cta')}</MoreLink>
          </div>
        </Container>
      </section>

      <Reveal as="section">
        <Container className="py-12 sm:py-16">
          <SectionHeading title={t('highlights.title')} subtitle={t('highlights.subtitle')} />
          <NoteGrid
            className="mt-8"
            items={HIGHLIGHTS.map((key) => ({
              key,
              title: t(`highlights.items.${key}.title`),
              body: t(`highlights.items.${key}.body`),
            }))}
          />
        </Container>
      </Reveal>

      {/* Set at the prose width and in the display serif: this paragraph is
          the one piece of the home page meant to be read slowly. */}
      <Reveal as="section">
        <Container width="prose" className="py-12 sm:py-16">
          <SectionHeading title={t('about.title')} />
          <p className="mt-6 text-(length:--text-xl) leading-snug text-(--text-primary) font-(family-name:--font-display)">
            {t('about.body')}
          </p>
          <div className="mt-6">
            <MoreLink to={localePath(ROUTES.about, locale)}>{t('about.cta')}</MoreLink>
          </div>
        </Container>
      </Reveal>

      <ClosingCta title={t('cta.title')} body={t('cta.body')} action={t('cta.button')} />
    </>
  )
}
