import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { MAP_ID } from '@/config/dom'
import { MAP, ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'

/**
 * Makes the footer address a link to the contact page's map, so "where are
 * you" is one click from every page (Harry, 2026-11-06), with a visible
 * "Show on the map" button under the address so the link does not depend on
 * hovering to be found. Without a map (`MAP` is null) it renders the address
 * as it is. The jump to the map is
 * instant, not a smooth scroll through a page still fading in:
 * `ScrollRestoration` does that for every link into another page's section.
 */
export const MapLink = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation('common')
  const { locale } = useLocale()
  if (MAP === null) return <>{children}</>
  return (
    <Link
      to={`${localePath(ROUTES.contact, locale)}#${MAP_ID}`}
      className="group block rounded-(--radius-sm) transition-colors hover:text-(--text-accent)"
    >
      {children}
      <span className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-(--border-strong) px-4 text-(length:--text-sm) font-medium text-(--text-primary) transition-colors group-hover:border-(--ring-accent) group-hover:text-(--text-accent)">
        <PinIcon />
        {t('map.showOnMap')}
      </span>
    </Link>
  )
}

const PinIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4 shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
)
