import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'

import { ROUTES } from '@/config/site'
import { localePath, rootLocale } from '@/lib/locale-path'

/**
 * Sends `/` to the visitor's language.
 *
 * i18next's detector has already looked at local storage and at the browser's
 * Accept-Language by the time this renders, so `resolvedLanguage` is the best
 * guess available. `replace` keeps `/` out of the history, so Back from
 * `/en` leaves the site instead of bouncing through the redirect again.
 *
 * A page load at `/` never gets here: `public/theme-init.js` sends a visitor
 * whose language is not the default on before the first paint, and `main.tsx`
 * moves the address to the default language's home before React starts
 * (`startupPlan`), so the prerendered page can be hydrated. This covers an
 * in-app navigation to `/`.
 */
export const RootRedirect = () => {
  const { i18n } = useTranslation()

  return <Navigate to={localePath(ROUTES.home, rootLocale(i18n.resolvedLanguage))} replace />
}
