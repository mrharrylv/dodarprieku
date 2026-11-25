import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'

import { NAV_LINKS, ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { cn } from '@/lib/cn'
import { localePath } from '@/lib/locale-path'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'

/** Milliseconds between one item's entrance and the next. */
const STAGGER_MS = 40

/**
 * The phone menu: a full panel, not a dropdown.
 *
 * It starts below the header rather than covering the whole viewport, so the
 * button that opened it stays visible and tappable. A panel that covers its own
 * close control is the most common way a mobile menu traps someone.
 *
 * It stays mounted and animates both ways: the panel fades and slides up a
 * few pixels into place and its links arrive one after another; closing plays
 * it back. Mounting it only when open made it appear in a single frame, which
 * read as a blink. Closed, it is `inert`, `aria-hidden` and
 * `pointer-events-none`, so nothing in it can be focused, clicked or read out.
 * The scroll lock lives in `useMobileMenu` and is gated on open, so a closed
 * menu locks nothing. Reduced motion zeroes the transitions in `index.css`, so
 * it then simply appears and disappears.
 *
 * `overflow-y-auto` matters: at 320px with three languages and four links this
 * is taller than a short phone in landscape, and a panel that cannot scroll
 * simply hides its last link.
 */
export const MobileMenu = ({
  id,
  open,
  onNavigate,
}: {
  id: string
  open: boolean
  onNavigate: () => void
}) => {
  const { t } = useTranslation('common')
  const { locale } = useLocale()

  // Each item's delay, counting the language row as the last item.
  const item = (index: number): CSSProperties => ({
    transitionDelay: open ? `${80 + index * STAGGER_MS}ms` : '0ms',
  })
  const itemClass = cn(
    'transition-[opacity,translate] duration-300 ease-(--ease-out-soft)',
    open ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0',
  )

  return (
    <div
      id={id}
      inert={!open}
      aria-hidden={!open}
      className={cn(
        'fixed inset-x-0 bottom-0 top-16 overflow-y-auto bg-(--surface-page) sm:top-20 lg:hidden',
        'transition-[opacity,translate] duration-300 ease-(--ease-out-soft)',
        open ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-3 opacity-0',
      )}
    >
      <Container>
        <nav aria-label={t('a11y.mainNavigation')} className="flex flex-col pb-10 pt-4">
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
                  'flex min-h-16 items-baseline gap-5 border-b border-(--border-subtle) py-4',
                  'font-(family-name:--font-display) text-(length:--text-3xl) font-semibold',
                  isActive ? 'text-(--text-accent)' : 'text-(--text-primary)',
                )
              }
            >
              {/* Decorative: the count carries no information a screen reader
                  needs, and read aloud it turns every link into "oh one home". */}
              <span
                aria-hidden="true"
                className="text-(length:--text-xs) font-semibold uppercase tracking-[0.3em] text-(--text-accent)"
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              {t(link.labelKey)}
            </NavLink>
          ))}

          <div
            style={item(NAV_LINKS.length)}
            className={cn(itemClass, 'mt-10 flex flex-wrap items-center justify-between gap-4')}
          >
            <LanguageSwitcher />
            <ButtonLink
              to={localePath(ROUTES.contact, locale)}
              className="uppercase tracking-[0.16em]"
            >
              {t('cta.contactUs')}
            </ButtonLink>
          </div>
        </nav>
      </Container>
    </div>
  )
}
