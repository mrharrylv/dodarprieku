import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { VALUES } from '@/data/services'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { Band } from './Band'
import { Glow } from './Decor'
import { PageHeader } from './PageHeader'
import { Pillars } from './Pillars'

/**
 * About: the story set narrow, then the values set wide.
 *
 * `.prose-page` caps the story at 44rem. That is not a stylistic preference on
 * a dark page, it is the reason the page is readable at all: light text on a
 * dark ground blooms slightly, and a long measure of it is where a reader loses
 * the line they were on.
 */
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

      <PageHeader title={t('hero.title')} subtitle={t('hero.subtitle')} />

      <Band tone="sunken" title={t('story.title')}>
        <div className="prose-page">
          <p>{t('story.body')}</p>
        </div>
      </Band>

      <Band title={t('values.title')}>
        <Pillars
          items={VALUES.map((key) => ({
            key,
            title: t(`values.items.${key}.title`),
            body: t(`values.items.${key}.body`),
          }))}
        />
      </Band>

      <Band tone="sunken" align="center" title={t('cta.title')} subtitle={t('cta.body')}>
        <div className="flex justify-center">
          <Glow>
            <ButtonLink
              to={localePath(ROUTES.contact, locale)}
              size="lg"
              className="uppercase tracking-[0.16em]"
            >
              {t('cta.button')}
            </ButtonLink>
          </Glow>
        </div>
      </Band>
    </>
  )
}
