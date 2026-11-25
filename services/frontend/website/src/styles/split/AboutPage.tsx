import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { VALUES } from '@/data/services'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { PageHead } from './PageHead'
import { SplitSection } from './SplitSection'

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

      <PageHead title={t('hero.title')} subtitle={t('hero.subtitle')} />

      <SplitSection heading={t('story.title')}>
        {/* prose-page caps the measure at roughly 75 characters. In the right
            half of a wide screen the story would otherwise run the full width
            of the column and cost the reader the line they were on. */}
        <div className="prose-page">
          <p>{t('story.body')}</p>
        </div>
      </SplitSection>

      <SplitSection flip tone="sunken" heading={t('values.title')}>
        <Reveal as="ul" className="border-t border-(--border-subtle)">
          {VALUES.map((key) => (
            <li key={key} className="border-b border-(--border-subtle) py-7">
              <h3 className="break-words font-(family-name:--font-display) text-(length:--text-xl) tracking-tight text-(--text-primary)">
                {t(`values.items.${key}.title`)}
              </h3>
              <p className="mt-2 max-w-xl text-(--text-secondary)">
                {t(`values.items.${key}.body`)}
              </p>
            </li>
          ))}
        </Reveal>
      </SplitSection>

      <SplitSection tone="accent" heading={t('cta.title')} lead={t('cta.body')}>
        <ButtonLink to={localePath(ROUTES.contact, locale)} size="lg">
          {t('cta.button')}
        </ButtonLink>
      </SplitSection>
    </>
  )
}
