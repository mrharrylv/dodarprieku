import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { Seo } from '@/components/seo/Seo'
import { OnePage } from './OnePage'
import { SECTIONS } from './sections'

/**
 * The services route: the same page, opened at the services band.
 *
 * Read the `path` prop before changing it. It is ROUTES.home, not
 * ROUTES.services, and that is not a copy-and-paste mistake.
 *
 * `Seo` turns `path` into the canonical URL. This route serves the identical
 * document to the home route, so declaring `/services` canonical would tell a
 * crawler that the site has four separate pages with the same body text,
 * which is duplicate content: the crawler picks one of them itself, splits
 * the ranking signals across the rest, and the choice is not ours. Pointing
 * every route's canonical at the home path says the true thing instead, that
 * there is one page and these are four ways in.
 *
 * The title and description are still this section's own, because they are
 * what a visitor sees in the tab and what a search result shows for the link
 * that brought them here. Route exists, meta is its own, canonical is shared.
 */
export const ServicesPage = () => {
  const { t } = useTranslation('services')
  const { locale } = useLocale()

  return (
    <>
      <Seo
        title={t('meta.title')}
        description={t('meta.description')}
        path={ROUTES.home}
        locale={locale}
      />
      <OnePage focus={SECTIONS.services} />
    </>
  )
}
