import { useTranslation } from 'react-i18next'
import { Link, NavLink } from 'react-router-dom'

import { CONTACT, NAV_LINKS, ROUTES, SITE } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { cn } from '@/lib/cn'
import { localePath } from '@/lib/locale-path'
import { Container } from '@/components/ui/Container'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

/**
 * A masthead, not a toolbar.
 *
 * Deliberately not sticky. A magazine page starts at the top, and a nameplate
 * that follows you down the page is a toolbar pretending to be one. Back to
 * top comes from `SiteChrome`, which every shell already renders.
 *
 * There is no hamburger either: four links wrap onto two rows at 320px, which
 * is one tap instead of two, with no overlay to lock scrolling or trap focus
 * in. If the navigation ever grows past six entries this decision needs
 * revisiting, not the styling around it.
 *
 * The nameplate carries no strapline. The only tagline string the template
 * has is `footer.tagline`, and the colophon already sets it: printing it here
 * too put the same sentence twice on every page in all three languages.
 */
export const Header = () => {
  const { t } = useTranslation('common')
  const { locale } = useLocale()

  return (
    <header className="bg-(--surface-page)">
      {/* Utility strip. The phone number sits first because a good share of
          visitors want exactly that and nothing else on the page. */}
      <div className="border-b border-(--border-subtle)">
        <Container>
          <div className="flex flex-wrap items-center justify-between gap-x-6">
            <a
              href={`tel:${CONTACT.phoneE164}`}
              className="inline-flex min-h-11 items-center text-(length:--text-xs) uppercase tracking-[0.18em] text-(--text-secondary) transition-colors hover:text-(--text-accent)"
            >
              {CONTACT.phone}
            </a>
            <div className="flex items-center gap-1">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>
        </Container>
      </div>

      <Container>
        <div className="py-9 text-center sm:py-14">
          <Link
            to={localePath(ROUTES.home, locale)}
            className="inline-block max-w-full break-words font-(family-name:--font-display) text-(length:--text-4xl) font-semibold leading-none tracking-[-0.04em] text-(--text-primary)"
          >
            {SITE.name}
          </Link>
        </div>
      </Container>

      {/* The two heavy rules around the navigation are the line the eye stops
          at before the page proper begins. --border-strong is repointed to
          full ink in tokens.css, so every structural rule in the style is one
          token and the contrast test measures it. */}
      <div className="border-y-2 border-(--border-strong)">
        <Container>
          <nav
            aria-label={t('a11y.mainNavigation')}
            className="flex flex-wrap items-center justify-center gap-x-1 sm:gap-x-6"
          >
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={localePath(link.to, locale)}
                end
                className={({ isActive }) =>
                  cn(
                    'inline-flex min-h-11 items-center px-2 font-(family-name:--font-display) text-(length:--text-sm) uppercase tracking-[0.16em] transition-colors',
                    isActive
                      ? 'text-(--text-accent)'
                      : 'text-(--text-secondary) hover:text-(--text-primary)',
                  )
                }
              >
                {t(link.labelKey)}
              </NavLink>
            ))}
          </nav>
        </Container>
      </div>
    </header>
  )
}
