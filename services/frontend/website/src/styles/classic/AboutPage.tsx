import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { Seo } from '@/components/seo/Seo'
import { legalValues } from '@/components/legal/legal-values'
import { RegisterButton } from '@/components/layout/RegisterButton'
import { Card } from '@/components/ui/Card'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'

/** The three steps a visitor takes, in order: `how.steps.<key>` in `about.json`. */
const STEPS = ['find', 'choose', 'deliver'] as const

/** "Par projektu": what Dodar prieku is, for visitors and for institutions. */
export const AboutPage = () => {
  const { t } = useTranslation('about')
  const { locale } = useLocale()
  const v = legalValues()

  return (
    <>
      <Seo title={t('meta.title')} description={t('meta.description')} path={ROUTES.about} locale={locale} />

      <Container className="py-16 sm:py-24">
        <h1 className="max-w-3xl text-(length:--text-4xl) text-(--text-primary)">{t('title')}</h1>
        <p className="mt-5 max-w-2xl text-(length:--text-lg) text-(--text-secondary)">{t('lead')}</p>
      </Container>

      <Section tone="sunken" title={t('how.title')}>
        <ol className="grid gap-5 sm:grid-cols-3">
          {STEPS.map((key, index) => (
            <li key={key}>
              <Card className="h-full">
                <p aria-hidden="true" className="text-(length:--text-2xl) font-semibold text-(--text-accent)">
                  {index + 1}
                </p>
                <p className="mt-3 text-(--text-secondary)">{t(`how.steps.${key}`)}</p>
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      <Section>
        <div className="prose-page">
          <h2>{t('recipients.title')}</h2>
          <p>{t('recipients.body')}</p>
          <h2>{t('money.title')}</h2>
          <p>{t('money.body')}</p>
          <h2>{t('operator.title')}</h2>
          <p>{t('operator.body', v)}</p>
        </div>
        <div className="mt-8">
          <RegisterButton size="lg" />
        </div>
      </Section>
    </>
  )
}
