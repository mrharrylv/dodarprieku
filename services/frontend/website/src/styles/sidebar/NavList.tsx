import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'

import { NAV_LINKS } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { cn } from '@/lib/cn'
import { localePath } from '@/lib/locale-path'

/**
 * The navigation, as a vertical list. Drawn twice: in the rail on lg, in the
 * overlay below it. Both copies carry every NAV_LINKS entry, so whichever one
 * a screen reader reaches is the complete set.
 *
 * The current item is marked three ways: a bar down its left edge, a tinted
 * surface, and a heavier weight. Colour alone would leave it invisible to
 * anyone who cannot separate the two hues (WCAG 1.4.1).
 *
 * The two-digit index is decoration, so it is `aria-hidden`: without that the
 * link's accessible name becomes "01 Home" and voice control ("click Home")
 * stops matching it.
 */
export const NavList = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { t } = useTranslation('common')
  const { locale } = useLocale()

  return (
    <nav aria-label={t('a11y.mainNavigation')} className="flex flex-col gap-0.5">
      {NAV_LINKS.map((link, index) => (
        <NavLink
          key={link.to}
          to={localePath(link.to, locale)}
          end
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'relative flex min-h-11 items-center gap-3 rounded-(--radius-md) pl-4 pr-3',
              'text-(length:--text-sm) transition-colors',
              isActive
                ? 'bg-(--surface-accent-soft) font-semibold text-(--text-accent)'
                : 'font-medium text-(--text-secondary) hover:bg-(--surface-sunken) hover:text-(--text-primary)',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-(--fill-accent)"
                />
              )}
              <span
                aria-hidden="true"
                className="font-(family-name:--font-display) text-(length:--text-xs) tabular-nums text-(--text-muted)"
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="truncate">{t(link.labelKey)}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
