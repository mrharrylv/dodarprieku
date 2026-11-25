import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { Seo } from '@/components/seo/Seo'
import { OnePage } from './OnePage'
import { SECTIONS } from './sections'
import { LocationMap } from '@/components/contact/LocationMap'

/**
 * The contact route: the same page, opened at the form in the last band.
 *
 * The form itself is the shared `ContactForm`, mounted by `ContactBand`.
 * `path={ROUTES.home}` is deliberate, and ServicesPage explains why.
 */
export const ContactPage = () => {
  const { t } = useTranslation('contact')
  const { locale } = useLocale()

  return (
    <>
      <Seo
        title={t('meta.title')}
        description={t('meta.description')}
        path={ROUTES.home}
        locale={locale}
      />
      <OnePage focus={SECTIONS.contact} />
      <LocationMap />
    </>
  )
}
