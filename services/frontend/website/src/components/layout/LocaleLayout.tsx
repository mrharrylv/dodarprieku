import { useEffect, type ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useParams } from 'react-router-dom'

import { isLocaleCode, fallbackPath } from '@/lib/locale-path'

/**
 * Guards the `/:lang` segment and keeps i18next in step with the URL.
 *
 * The URL is the authority, not the stored preference. Someone opening a
 * shared `/lv/services` link must get Latvian even if they once chose English
 * here, otherwise the page contradicts its own address, and that address is
 * what search engines index.
 *
 * An unknown segment (`/de/services`, or a typo) redirects to the default
 * locale rather than rendering an empty shell. On a page load in production
 * the edge has already sent it there with a 301 (viewer-request.js); this is
 * the same rule for the dev server and for an in-app navigation.
 *
 * `Shell` is the active style's; this component does not care which.
 */
export const LocaleLayout = ({ Shell }: { Shell: ComponentType }) => {
  const { lang } = useParams<{ lang: string }>()
  const { pathname } = useLocation()
  const { i18n } = useTranslation()

  const valid = isLocaleCode(lang)

  useEffect(() => {
    if (valid && i18n.resolvedLanguage !== lang) {
      void i18n.changeLanguage(lang)
    }
  }, [i18n, lang, valid])

  // `fallbackPath` keeps the page the visitor asked for: `/services` becomes
  // `/en/services`, and `/de/services` becomes `/en/services`, not the home
  // page, which is where a naive redirect would dump them.
  if (!valid) {
    return <Navigate to={fallbackPath(pathname)} replace />
  }

  return <Shell />
}
