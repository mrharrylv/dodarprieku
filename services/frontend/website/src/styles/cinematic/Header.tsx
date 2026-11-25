import { useTranslation } from 'react-i18next'
import { Link, NavLink } from 'react-router-dom'

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

/**
 * A slim, near transparent bar over a dark page.
 *
 * The navigation is set in small capitals with wide tracking, so the header
 * reads as a title card rather than as a toolbar. The active page is marked by
 * a hairline under the label AND by a colour change: colour alone would fail
 * WCAG 1.4.1, and on a dark ground a single hairline is easy to miss.
 */
export const Header = () => {
  const { t } = useTranslation('common')
  const { locale } = useLocale()

  const { open: menuOpen, toggle: toggleMenu, close: closeMenu, toggleRef } = useMobileMenu()

  return (
    <header className="sticky top-0 z-50 border-b border-(--border-subtle) bg-(--surface-page)/75 backdrop-blur-xl">
      <Container>
        <div className="flex h-16 items-center justify-between gap-3 sm:h-20">
          <Link
            to={localePath(ROUTES.home, locale)}
            className="whitespace-nowrap font-(family-name:--font-display) text-(length:--text-sm) font-semibold uppercase tracking-[0.2em] text-(--text-primary) sm:tracking-[0.3em]"
          >
            {SITE.name}
          </Link>

          <nav
            aria-label={t('a11y.mainNavigation')}
            className="hidden items-center gap-8 lg:flex"
          >
            {NAV_LINKS.map((link) => (
              <NavItem key={link.to} to={localePath(link.to, locale)}>
                {t(link.labelKey)}
              </NavItem>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <ThemeToggle />
            <ButtonLink
              to={localePath(ROUTES.contact, locale)}
              size="sm"
              className="hidden uppercase tracking-[0.16em] lg:inline-flex"
            >
              {t('cta.contactUs')}
            </ButtonLink>

            <button
              ref={toggleRef}
              type="button"
              onClick={toggleMenu}
              aria-expanded={menuOpen}
              aria-controls="cinematic-menu"
              aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              className="inline-flex h-11 w-11 items-center justify-center rounded-(--radius-md) text-(--text-secondary) transition-colors hover:bg-(--surface-raised) hover:text-(--text-primary) lg:hidden"
            >
              <Icon name={menuOpen ? 'close' : 'menu'} className="h-6 w-6" />
            </button>
          </div>
        </div>
      </Container>

      <MobileMenu id="cinematic-menu" open={menuOpen} onNavigate={closeMenu} />
    </header>
  )
}

const NavItem = ({ to, children }: { to: string; children: string }) => (
  <NavLink
    to={to}
    end
    className={({ isActive }) =>
      cn(
        'relative inline-flex min-h-11 items-center text-(length:--text-xs) font-semibold uppercase tracking-[0.2em] transition-colors',
        isActive ? 'text-(--text-accent)' : 'text-(--text-secondary) hover:text-(--text-primary)',
      )
    }
  >
    {({ isActive }) => (
      <>
        {children}
        <span
          aria-hidden="true"
          className={cn(
            'absolute inset-x-0 bottom-2 h-px transition-colors',
            isActive ? 'bg-(--fill-accent)' : 'bg-transparent',
          )}
        />
      </>
    )}
  </NavLink>
)
