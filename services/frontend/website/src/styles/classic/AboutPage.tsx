import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { VALUES } from '@/data/services'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'

export const AboutPage = () => {
  const { t } = useTranslation('about')
  const { locale } = useLocale()

  return (
    <>
      <Seo
        title={t('meta.title')}
        description={t('meta.description')}
        path={ROUTES.about}
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
        <div className="prose-page">
          <h2 className="text-(length:--text-2xl) text-(--text-primary)">
            {t('story.title')}
          </h2>
          <p>{t('story.body')}</p>
        </div>
      </Section>

      <Section title={t('values.title')}>
        <ul className="grid gap-5 sm:grid-cols-3">
          {VALUES.map((key) => (
            <li key={key}>
              <Card className="h-full">
                <h3 className="text-(length:--text-lg) text-(--text-primary)">
                  {t(`values.items.${key}.title`)}
                </h3>
                <p className="mt-3 text-(--text-secondary)">
                  {t(`values.items.${key}.body`)}
                </p>
              </Card>
            </li>
          ))}
        </ul>
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
