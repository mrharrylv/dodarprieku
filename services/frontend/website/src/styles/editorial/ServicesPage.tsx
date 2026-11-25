import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { PROCESS_STEPS, SERVICES } from '@/data/services'
import { useLocale } from '@/hooks/useLocale'
import { Seo } from '@/components/seo/Seo'
import { Container } from '@/components/ui/Container'
import { ClosingCta } from './ClosingCta'
import { EntryRow } from './EntryRow'
import { NoteGrid } from './NoteGrid'
import { PageIntro } from './PageIntro'
import { SectionHeading } from './SectionHeading'

/**
 * The services page is the two-column spread the style exists for: the name on
 * the left, the writing on the right, a rule between them and between each
 * pair. Each row carries the id the home page links to.
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

      <PageIntro kicker={tc('nav.services')} title={t('hero.title')} subtitle={t('hero.subtitle')} />

      <section>
        <Container className="py-12 sm:py-16">
          <ol>
            {SERVICES.map((service, index) => (
              <EntryRow
                key={service.key}
                id={service.slug}
                index={index}
                headingLevel="h2"
                title={t(`items.${service.key}.title`)}
                lead={t(`items.${service.key}.summary`)}
                body={t(`items.${service.key}.body`)}
              />
            ))}
          </ol>
        </Container>
      </section>

      <section>
        <Container className="pb-12 sm:pb-16">
          <SectionHeading title={t('process.title')} />
          {/* An ol, because the order is the meaning here: talk, price, work. */}
          <NoteGrid
            as="ol"
            className="mt-8"
            items={PROCESS_STEPS.map((step) => ({
              key: step,
              title: t(`process.steps.${step}.title`),
              body: t(`process.steps.${step}.body`),
            }))}
          />
        </Container>
      </section>

      <ClosingCta title={t('cta.title')} body={t('cta.body')} action={t('cta.button')} />
    </>
  )
}
