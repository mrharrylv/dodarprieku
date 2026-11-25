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
 * The header is itself a tile: a bordered bar floating on the page ground with
 * a gap on all four sides, so the first thing a visitor sees is the grid
 * language the rest of the page is written in.
 *
 * The bar is opaque and the strip behind it is a translucent wash of the page
 * ground, which is what stops tiles sliding visibly under a rounded corner as
 * the page scrolls.
 */
export const Header = () => {
  const { t } = useTranslation('common')
  const { locale } = useLocale()

  const { open: menuOpen, toggle: toggleMenu, close: closeMenu, toggleRef } = useMobileMenu()

  return (
    <header className="sticky top-0 z-50 bg-(--surface-sunken)/85 backdrop-blur-md">
      <Container className="py-3">
        <div className="flex min-h-16 items-center justify-between gap-2 rounded-(--radius-xl) border border-(--border-subtle) bg-(--surface-raised) px-2.5 py-2 sm:px-4">
          <Link
            to={localePath(ROUTES.home, locale)}
            className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-(--radius-md) pr-2 text-(--text-primary)"
          >
            {/* The brand initial as a filled square: the smallest tile on the
                page, and it makes the header legible at 320px where the full
                name has to truncate. */}
            <span
              aria-hidden="true"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-(--radius-md) bg-(--fill-accent) font-(family-name:--font-display) text-(length:--text-lg) font-semibold text-(--text-on-accent)"
            >
              {SITE.name.slice(0, 1)}
            </span>
            <span className="truncate text-(length:--text-lg) font-semibold tracking-tight">
              {SITE.name}
            </span>
          </Link>

          <nav
            aria-label={t('a11y.mainNavigation')}
            className="hidden items-center gap-1 lg:flex"
          >
            {NAV_LINKS.map((link) => (
              <NavChip key={link.to} to={localePath(link.to, locale)}>
                {t(link.labelKey)}
              </NavChip>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
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
              aria-controls="bento-menu"
              aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              className="inline-flex h-11 w-11 items-center justify-center rounded-(--radius-md) text-(--text-secondary) transition-colors hover:bg-(--surface-sunken) hover:text-(--text-primary) lg:hidden"
            >
              <Icon name={menuOpen ? 'close' : 'menu'} className="h-5 w-5" />
            </button>
          </div>
        </div>
      </Container>

      <MobileMenu id="bento-menu" open={menuOpen} onNavigate={closeMenu} />
    </header>
  )
}

/** A navigation link as a chip, so the active page is a filled tile rather
    than a coloured word: the same shape vocabulary as the page below it. */
const NavChip = ({ to, children }: { to: string; children: string }) => (
  <NavLink
    to={to}
    end
    className={({ isActive }) =>
      cn(
        'inline-flex min-h-11 items-center rounded-(--radius-md) px-3.5',
        'text-(length:--text-sm) font-semibold transition-colors',
        isActive
          ? 'bg-(--surface-accent-soft) text-(--text-accent)'
          : 'text-(--text-secondary) hover:bg-(--surface-sunken) hover:text-(--text-primary)',
      )
    }
  >
    {children}
  </NavLink>
)
