import { useTranslation } from 'react-i18next'
import { Link, NavLink } from 'react-router-dom'

import { NAV_LINKS, ROUTES, SITE } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { useMobileMenu } from '@/hooks/useMobileMenu'
import { cn } from '@/lib/cn'
import { localePath } from '@/lib/locale-path'
import { Container } from '@/components/ui/Container'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { MobileMenu } from './MobileMenu'

/**
 * A thin rule across the top and nothing else.
 *
 * The height is deliberately fixed and deliberately small: it is subtracted
 * from every deck panel, and anything taller starts eating the screen the deck
 * is trying to give away. It is `--paged-header-h` in tokens.css, declared
 * there once because the panels, the overlay menu and the scroll padding all
 * have to agree with it. No contact button up here either; the last panel of
 * the deck is the call to action.
 */
export const Header = () => {
  const { t } = useTranslation('common')
  const { locale } = useLocale()

  const { open: menuOpen, toggle: toggleMenu, close: closeMenu, toggleRef } = useMobileMenu()

  return (
    <header className="sticky top-0 z-50 h-(--paged-header-h) border-b border-(--border-subtle) bg-(--surface-page)/80 backdrop-blur-md">
      <Container className="flex h-(--paged-header-h) items-center justify-between gap-3">
        {/* min-w-0 and truncate: a long brand name set in letterspaced capitals
            is one unbreakable word, and at 320px it would otherwise push the
            theme and language controls off the side of the header. */}
        <Link
          to={localePath(ROUTES.home, locale)}
          className="min-w-0 truncate font-(family-name:--font-display) text-(length:--text-sm) font-semibold uppercase tracking-[0.28em] text-(--text-primary)"
        >
          {SITE.name}
        </Link>

        <nav
          aria-label={t('a11y.mainNavigation')}
          className="hidden items-center md:flex"
        >
          {NAV_LINKS.map((link, index) => (
            <NavLink
              key={link.to}
              to={localePath(link.to, locale)}
              end
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center gap-2 px-3 text-(length:--text-xs) font-medium uppercase tracking-[0.18em] transition-colors',
                  isActive
                    ? 'text-(--text-accent)'
                    : 'text-(--text-secondary) hover:text-(--text-primary)',
                )
              }
            >
              {/* The numbering is the deck's counting made visible. It carries
                  no information, so it is hidden from assistive tech. */}
              <span aria-hidden="true" className="text-(--text-muted)">
                {String(index + 1).padStart(2, '0')}
              </span>
              {t(link.labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />

          <button
            ref={toggleRef}
            type="button"
            onClick={toggleMenu}
            aria-expanded={menuOpen}
            aria-controls="paged-menu"
            aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            className="inline-flex h-11 w-11 items-center justify-center rounded-(--radius-md) text-(--text-secondary) transition-colors hover:bg-(--surface-sunken) hover:text-(--text-primary) md:hidden"
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </Container>

      <MobileMenu
        id="paged-menu"
        open={menuOpen}
        locale={locale}
        onNavigate={closeMenu}
      />
    </header>
  )
}

const MenuIcon = ({ open }: { open: boolean }) => (
  <svg
    className="h-6 w-6"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    aria-hidden="true"
    focusable="false"
  >
    {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 9h16M4 15h16" />}
  </svg>
)
