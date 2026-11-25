import { useTranslation } from 'react-i18next'
import { Link, NavLink } from 'react-router-dom'

import { NAV_LINKS, ROUTES, SITE } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { cn } from '@/lib/cn'
import { localePath } from '@/lib/locale-path'
import { Container } from '@/components/ui/Container'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

/**
 * A masthead, not a navigation bar.
 *
 * It is static, not sticky: the point of the style is that nothing floats over
 * the reading column, and a bar that follows you down a page this airy is the
 * one thing that would break it. The brand sits at body size, the links at
 * small, and there is no header button, because the page already ends in one
 * and two competing calls to action is how a minimal page stops being minimal.
 *
 * There is no hamburger either. Four short links wrap onto their own line
 * under about 640px, which is fewer taps than a menu and nothing to open,
 * close, trap focus in or forget to close on navigate.
 */
export const Header = () => {
  const { t } = useTranslation('common')
  const { locale } = useLocale()

  return (
    <header className="border-b border-(--border-subtle)">
      <Container>
        <div className="flex flex-wrap items-center gap-x-10 gap-y-1 py-2 sm:py-3">
          <Link
            to={localePath(ROUTES.home, locale)}
            className="inline-flex min-h-11 w-full items-center text-(length:--text-base) font-semibold tracking-tight text-(--text-primary) sm:mr-auto sm:w-auto"
          >
            {SITE.name}
          </Link>

          <nav
            aria-label={t('a11y.mainNavigation')}
            className="flex flex-wrap items-center gap-x-6"
          >
            {NAV_LINKS.map((link) => (
              <HeaderLink key={link.to} to={localePath(link.to, locale)}>
                {t(link.labelKey)}
              </HeaderLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </Container>
    </header>
  )
}

/**
 * The current page is marked with a rule under the word rather than a colour,
 * so the header holds no accent at all and the only coloured thing above the
 * fold is a link the visitor can follow.
 */
const HeaderLink = ({ to, children }: { to: string; children: string }) => (
  <NavLink
    to={to}
    end
    className={({ isActive }) =>
      cn(
        'inline-flex min-h-11 items-center text-(length:--text-sm) transition-colors',
        isActive
          ? 'font-medium text-(--text-primary) underline decoration-1 underline-offset-8'
          : 'text-(--text-secondary) hover:text-(--text-primary)',
      )
    }
  >
    {children}
  </NavLink>
)
