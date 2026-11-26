import { useTranslation } from 'react-i18next'

import type { PublicCharity } from '@shared/contracts'
import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import type { MapRoute } from '@/lib/map-route'
import { Seo } from '@/components/seo/Seo'

/** The page title for what the address opens, from the namespace that names it. */
const useTitle = (route: MapRoute, charity: PublicCharity | undefined): string => {
  const { t } = useTranslation('map')
  const { t: tr } = useTranslation('register')
  const { t: ta } = useTranslation('account')
  const { t: tab } = useTranslation('about')
  if (route.dock?.kind === 'register') return tr('meta.title')
  if (route.dock?.view === 'forgot') return ta('forgotPassword.meta.title')
  if (route.dock?.view === 'set-password') return ta('setPassword.meta.title')
  if (route.dock?.kind === 'account') return ta('meta.title')
  if (route.info) return tab('meta.title')
  if (charity !== undefined) return charity.profile.organization.name
  return t('meta.title')
}

/**
 * The map's head. Every address that opens the map is one page, so every one
 * names the home page as its canonical: the sitemap and llms.txt list only
 * `/`, and a crawler never indexes a panel as a page of its own. The title
 * says what is open, for the tab and for history; a shared charity's address
 * takes the charity's name and city once the snapshot has them.
 */
export const MapSeo = ({ route, charity }: { route: MapRoute; charity: PublicCharity | undefined }) => {
  const { t } = useTranslation('map')
  const { t: tc } = useTranslation('charity')
  const { locale } = useLocale()
  const title = useTitle(route, charity)
  const description =
    charity !== undefined
      ? tc('meta.charityDescription', { name: charity.profile.organization.name, city: charity.profile.address.city })
      : t('meta.description')
  return <Seo title={title} description={description} path={ROUTES.home} locale={locale} />
}
