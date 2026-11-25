import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

import { NAV_LINKS, ROUTES, SITE } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { useMobileMenu } from '@/hooks/useMobileMenu'
import { cn } from '@/lib/cn'
import { localePath } from '@/lib/locale-path'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Icon } from '@/components/ui/Icon'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { MobileMenu } from './MobileMenu'
import { ROUTE_FOR_SECTION, WATCHED_SECTIONS } from './sections'
import { useActiveSection } from './useActiveSection'

/**
 * A masthead rather than a menu bar: small wide-tracked capitals, one hairline
 * underneath, and nothing else competing with the page below it.
 *
 * The navigation still uses real route links, and that is deliberate. They
 * behave like anchors because every route renders the same document and
 * scrolls to a band, but they carry a genuine href, so middle-click, "open in
 * new tab", a crawler and a shared link all keep working. A nav built from
 * `#hash` strings gives up all four.
 */
export const Header = () => {
  const { t } = useTranslation('common')
  const { locale } = useLocale()
  const { pathname } = useLocation()

  const { open: menuOpen, toggle: toggleMenu, close: closeMenu, toggleRef } = useMobileMenu()

  const activeSection = useActiveSection(WATCHED_SECTIONS, pathname)

  /**
   * Which nav item is lit. While a band is in view the scroll position wins,
   * because that is what the reader can see. On the legal pages no band is in
   * view and the URL is the only answer there is.
   */
  const isCurrent = (to: string): boolean =>
    activeSection === null
      ? pathname === localePath(to, locale)
      : ROUTE_FOR_SECTION[activeSection] === to

  return (
    <header className="sticky top-0 z-50 border-b border-(--border-subtle) bg-(--surface-page)/90 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4 lg:h-20">
          <Link
            to={localePath(ROUTES.home, locale)}
            className="inline-flex min-h-11 items-center font-(family-name:--font-display) text-(length:--text-sm) font-semibold uppercase tracking-[0.24em] text-(--text-primary)"
          >
            {SITE.name}
          </Link>

          <nav
            aria-label={t('a11y.mainNavigation')}
            className="hidden items-center gap-7 lg:flex"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={localePath(link.to, locale)}
                // "true", not "page": on a one-page site this marks the
                // current item of a set, which is what a band is. "page" would
                // claim the reader is on a different document, and they never
                // are.
                aria-current={isCurrent(link.to) ? 'true' : undefined}
                className={cn(
                  'relative inline-flex min-h-11 items-center text-(length:--text-sm)',
                  'font-medium uppercase tracking-[0.14em] transition-colors',
                  isCurrent(link.to)
                    ? 'text-(--text-accent)'
                    : 'text-(--text-secondary) hover:text-(--text-primary)',
                )}
              >
                {t(link.labelKey)}
                {/* Empty and hidden: it is the indicator, and it must not join
                    the link's accessible name. It grows from the left rather
                    than fading, so the eye follows it down the page. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-x-0 bottom-3 h-0.5 origin-left bg-(--fill-accent)',
                    'transition-transform duration-300 ease-(--ease-out-soft)',
                    isCurrent(link.to) ? 'scale-x-100' : 'scale-x-0',
                  )}
                />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <ThemeToggle />
            <ButtonLink
              to={localePath(ROUTES.contact, locale)}
              size="sm"
              className="hidden lg:inline-flex"
            >
              {t('cta.contactUs')}
            </ButtonLink>

            <button
              ref={toggleRef}
              type="button"
              onClick={toggleMenu}
              aria-expanded={menuOpen}
              aria-controls="long-scroll-menu"
              aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              className="inline-flex h-11 w-11 items-center justify-center rounded-(--radius-sm) text-(--text-primary) transition-colors hover:bg-(--surface-sunken) lg:hidden"
            >
              <Icon name={menuOpen ? 'close' : 'menu'} className="h-6 w-6" />
            </button>
          </div>
        </div>
      </Container>

      <MobileMenu
        id="long-scroll-menu"
        open={menuOpen}
        isCurrent={isCurrent}
        onNavigate={closeMenu}
      />
    </header>
  )
}
