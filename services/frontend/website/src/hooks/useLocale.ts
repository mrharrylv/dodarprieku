import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import { DEFAULT_LOCALE, LOCALE_CODES, type LocaleCode } from '@/config/site'
import { switchLocale } from '@/lib/locale-path'

/**
 * The current locale, and a way to change it that keeps the visitor on the page
 * they are reading.
 *
 * A language switcher that navigates to `/lv` sends someone reading the terms
 * of service back to the home page, in a language they have to re-find their
 * place in. This navigates to `/lv/legal/terms`.
 */
export const useLocale = () => {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const current: LocaleCode = (LOCALE_CODES as readonly string[]).includes(
    i18n.resolvedLanguage ?? '',
  )
    ? (i18n.resolvedLanguage as LocaleCode)
    : DEFAULT_LOCALE

  const change = useCallback(
    (next: LocaleCode) => {
      if (next === current) return
      // Change the URL; the route's own effect changes i18next. Doing it the
      // other way round leaves the URL saying one language and the page showing
      // another, which is what search engines index.
      void navigate(switchLocale(location.pathname, next) + location.search + location.hash)
    },
    [current, location.hash, location.pathname, location.search, navigate],
  )

  return { locale: current, change }
}
