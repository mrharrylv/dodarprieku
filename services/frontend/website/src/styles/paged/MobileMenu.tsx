import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'

import { NAV_LINKS, ROUTES, type LocaleCode } from '@/config/site'
import { cn } from '@/lib/cn'
import { localePath } from '@/lib/locale-path'
import { ButtonLink } from '@/components/ui/Button'

/** Milliseconds between one item's entrance and the next. */
const STAGGER_MS = 40

/**
 * The menu is a screen, like everything else in this style: it covers the
 * viewport below the header and sets the four links at deck scale.
 *
 * It stays mounted and animates both ways: the screen fades and slides in,
 * and its links arrive one after another; closing plays it back. Mounting it
 * only when open made it appear in a single frame, which read as a blink.
 * Closed, it is `inert`, `aria-hidden` and ignores the pointer, so nothing in
 * it can be focused, clicked or read out. The scroll lock and Escape handling
 * live in `useMobileMenu` and apply only while open. Reduced motion zeroes the
 * transitions in `index.css`, so it then simply appears and disappears.
 *
 * It duplicates the header's navigation rather than moving it, so the link list
 * exists at every width even when one copy is hidden.
 */
export const MobileMenu = ({
  id,
  open,
  locale,
  onNavigate,
}: {
  id: string
  open: boolean
  locale: LocaleCode
  onNavigate: () => void
}) => {
  const { t } = useTranslation('common')

  // Each item's delay, counting the contact button as the last item.
  const item = (index: number): CSSProperties => ({
    transitionDelay: open ? `${80 + index * STAGGER_MS}ms` : '0ms',
  })
  const itemClass = cn(
    'transition-[opacity,translate] duration-300 ease-(--ease-out-soft)',
    open ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0',
  )

  // `top` is --paged-header-h, the one place the header height is written, so
  // the overlay starts exactly under the header rather than near it.
  return (
    <div
      id={id}
      inert={!open}
      aria-hidden={!open}
      className={cn(
        'fixed inset-x-0 bottom-0 top-(--paged-header-h) z-40 overflow-y-auto bg-(--surface-page) transition-[opacity,translate] duration-300 ease-(--ease-out-soft) md:hidden',
        open
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none -translate-y-3 opacity-0',
      )}
    >
      <nav
        aria-label={t('a11y.mainNavigation')}
        className="flex flex-col items-center gap-2 px-6 py-14"
      >
        {NAV_LINKS.map((link, index) => (
          <NavLink
            key={link.to}
            to={localePath(link.to, locale)}
            end
            onClick={onNavigate}
            style={item(index)}
            className={({ isActive }) =>
              cn(
                itemClass,
                'flex min-h-14 w-full max-w-full items-baseline justify-center gap-3 text-(length:--text-3xl) font-semibold tracking-tight ',
                isActive ? 'text-(--text-accent)' : 'text-(--text-primary)',
              )
            }
          >
            <span
              aria-hidden="true"
              className="text-(length:--text-xs) font-medium tracking-[0.2em] text-(--text-muted)"
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            {t(link.labelKey)}
          </NavLink>
        ))}

        <div style={item(NAV_LINKS.length)} className={cn(itemClass, 'mt-8')}>
          <ButtonLink to={localePath(ROUTES.contact, locale)} size="lg">
            {t('cta.contactUs')}
          </ButtonLink>
        </div>
      </nav>
    </div>
  )
}
