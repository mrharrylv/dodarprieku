import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'

import { NAV_LINKS } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { cn } from '@/lib/cn'
import { localePath } from '@/lib/locale-path'

/**
 * Every NAV_LINKS entry, stacked, inside one labelled navigation landmark.
 *
 * Both copies of the navigation render this: the rail on a large screen and
 * the drop-down on a phone. One source means a link cannot go missing from
 * one of them, which is the failure the contract test is looking for.
 *
 * `itemClassName` and `itemStyle` let the phone menu animate each row in turn
 * without the rail knowing anything about it.
 *
 * The rule under each item is the style's whole idea in miniature: structure
 * is a straight line, not a box.
 */
export const NavList = ({
  size,
  onNavigate,
  itemClassName,
  itemStyle,
}: {
  size: 'rail' | 'menu'
  onNavigate?: () => void
  itemClassName?: string
  itemStyle?: (index: number) => CSSProperties
}) => {
  const { t } = useTranslation('common')
  const { locale } = useLocale()

  return (
    <nav aria-label={t('a11y.mainNavigation')}>
      <ul className="flex flex-col border-t border-(--border-subtle)">
        {NAV_LINKS.map((link, index) => (
          <li
            key={link.to}
            style={itemStyle?.(index)}
            className={cn('border-b border-(--border-subtle)', itemClassName)}
          >
            <NavLink
              to={localePath(link.to, locale)}
              end
              onClick={onNavigate}
              className={cn(
                // min-h-12 is the touch target, not decoration: these are the
                // links a thumb reaches for most on a phone.
                'group flex min-h-12 items-center gap-4 py-3',
                'font-(family-name:--font-display) tracking-tight',
                'transition-colors',
                size === 'rail'
                  ? 'text-(length:--text-2xl)'
                  : 'text-(length:--text-xl)',
              )}
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'block h-px shrink-0 transition-[width,background-color]',
                      'duration-200 ease-(--ease-out-soft)',
                      isActive
                        ? 'w-10 bg-(--fill-accent)'
                        : 'w-4 bg-(--border-strong) group-hover:w-10',
                    )}
                  />
                  <span
                    className={cn(
                      'transition-colors',
                      isActive
                        ? 'text-(--text-accent)'
                        : 'text-(--text-primary) group-hover:text-(--text-accent)',
                    )}
                  >
                    {t(link.labelKey)}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
