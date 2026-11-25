import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { Seo } from '@/components/seo/Seo'
import { OnePage } from './OnePage'

/**
 * The home route: the one page, from the top.
 *
 * Every route in this style renders the same document, so the canonical URL
 * of all four is this one. See ServicesPage for why that is deliberate.
 */
export const HomePage = () => {
  const { t } = useTranslation('home')
  const { locale } = useLocale()

  return (
    <>
      <Seo
        title={t('meta.title')}
        description={t('meta.description')}
        path={ROUTES.home}
        locale={locale}
      />
      <OnePage focus={null} />
    </>
  )
}
