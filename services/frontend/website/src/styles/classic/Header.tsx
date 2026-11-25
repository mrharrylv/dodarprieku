import { useTranslation } from 'react-i18next'
import { Link, NavLink } from 'react-router-dom'

import { NAV_LINKS, ROUTES, SITE } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { useMobileMenu } from '@/hooks/useMobileMenu'
import { cn } from '@/lib/cn'
import { localePath } from '@/lib/locale-path'
import { Container } from '@/components/ui/Container'
import { BrandMark } from '@/components/layout/BrandMark'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { RegisterButton } from '@/components/layout/RegisterButton'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { MobileMenu } from './MobileMenu'

export const Header = () => {
  const { t } = useTranslation('common')
  const { locale } = useLocale()

  const { open: menuOpen, toggle: toggleMenu, close: closeMenu, toggleRef } = useMobileMenu()

  const home = localePath(ROUTES.home, locale)

  return (
    <header className="sticky top-0 z-50 border-b border-(--border-subtle) bg-(--surface-page)/85 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4 sm:h-20">
          <Link
            to={home}
            className="inline-flex min-h-11 items-center gap-2 font-(family-name:--font-display) text-(length:--text-xl) font-semibold tracking-tight text-(--text-primary)"
          >
            <BrandMark />
            <span>{SITE.name}</span>
          </Link>

          <nav
            aria-label={t('a11y.mainNavigation')}
            className="hidden items-center gap-1 lg:flex"
          >
            {NAV_LINKS.map((link) => (
              <DesktopLink key={link.to} to={localePath(link.to, locale)}>
                {t(link.labelKey)}
              </DesktopLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <ThemeToggle />
            {/* Wrapped: the button's own inline-flex would fight a `hidden` passed to it. */}
            <span className="hidden sm:inline-flex">
              <RegisterButton />
            </span>

            <button
              ref={toggleRef}
              type="button"
              onClick={toggleMenu}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              className="inline-flex h-11 w-11 items-center justify-center rounded-(--radius-md) text-(--text-secondary) transition-colors hover:bg-(--surface-sunken) hover:text-(--text-primary) lg:hidden"
            >
              <MenuIcon open={menuOpen} />
            </button>
          </div>
        </div>
      </Container>

      <MobileMenu id="mobile-menu" open={menuOpen} locale={locale} onNavigate={closeMenu} />
    </header>
  )
}

const DesktopLink = ({ to, children }: { to: string; children: string }) => (
  <NavLink
    to={to}
    end
    className={({ isActive }) =>
      cn(
        'rounded-(--radius-sm) px-3 py-2 text-(length:--text-sm) font-medium transition-colors',
        isActive
          ? 'text-(--text-accent)'
          : 'text-(--text-secondary) hover:text-(--text-primary)',
      )
    }
  >
    {children}
  </NavLink>
)

const MenuIcon = ({ open }: { open: boolean }) => (
  <svg
    className="h-6 w-6"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    aria-hidden="true"
    focusable="false"
  >
    {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
  </svg>
)
