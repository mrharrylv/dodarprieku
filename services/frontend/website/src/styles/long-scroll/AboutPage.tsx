import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { Seo } from '@/components/seo/Seo'
import { OnePage } from './OnePage'
import { SECTIONS } from './sections'

/**
 * The about route: the same page, opened at the about band.
 *
 * `path={ROUTES.home}` is deliberate, and ServicesPage explains why.
 */
export const AboutPage = () => {
  const { t } = useTranslation('about')
  const { locale } = useLocale()

  return (
    <>
      <Seo
        title={t('meta.title')}
        description={t('meta.description')}
        path={ROUTES.home}
        locale={locale}
      />
      <OnePage focus={SECTIONS.about} />
    </>
  )
}
