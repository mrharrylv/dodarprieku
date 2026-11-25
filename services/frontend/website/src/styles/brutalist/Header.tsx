import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { ROUTES, SITE } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { useMobileMenu } from '@/hooks/useMobileMenu'
import { cn } from '@/lib/cn'
import { localePath } from '@/lib/locale-path'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { MainNav, MobileMenu } from './Nav'
import { FOCUS, HARD_EDGE } from './marks'

/**
 * Two stacked bars under one 4px rule: identity and controls on top, the
 * bracketed navigation underneath. Splitting them is what lets the nav sit at
 * the left margin, in line with every other rule on the page, instead of
 * floating in the middle of a single row.
 */
export const Header = () => {
  const { t } = useTranslation('common')
  const { locale } = useLocale()

  const { open: menuOpen, toggle: toggleMenu, close: closeMenu, toggleRef } = useMobileMenu()

  return (
    <header className="border-b-4 border-(--border-strong) bg-(--surface-page)">
      <Container>
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-2 border-b-2 border-(--border-subtle) py-2">
          <Link
            to={localePath(ROUTES.home, locale)}
            className={cn(
              // max-w-full so a long brand name wraps instead of widening the bar.
              'inline-flex min-h-11 max-w-full items-center break-words text-(length:--text-lg) font-bold uppercase tracking-[0.2em] text-(--text-primary)',
              FOCUS,
            )}
          >
            {SITE.name}
          </Link>

          <div className="flex items-center gap-2">
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <ThemeToggle />

            <button
              ref={toggleRef}
              type="button"
              onClick={toggleMenu}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              className={cn(
                'inline-flex h-11 w-11 items-center justify-center border-2 border-(--border-strong) text-(--text-primary) md:hidden',
                FOCUS,
              )}
            >
              <MenuIcon open={menuOpen} />
            </button>
          </div>
        </div>
      </Container>

      <Container>
        <div className="hidden items-center justify-between gap-4 py-2 md:flex">
          <MainNav locale={locale} />
          <ButtonLink
            to={localePath(ROUTES.contact, locale)}
            size="sm"
            className={HARD_EDGE}
          >
            {t('cta.contactUs')}
          </ButtonLink>
        </div>
      </Container>

      <MobileMenu
        id="mobile-menu"
        open={menuOpen}
        locale={locale}
        onNavigate={closeMenu}
      />
    </header>
  )
}

/** Square caps and a 2px stroke: the icon has to match the rules around it. */
const MenuIcon = ({ open }: { open: boolean }) => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="square"
    aria-hidden="true"
    focusable="false"
  >
    {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
  </svg>
)
