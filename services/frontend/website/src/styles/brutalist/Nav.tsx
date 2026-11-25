import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'

import { NAV_LINKS, ROUTES } from '@/config/site'
import { cn } from '@/lib/cn'
import { localePath } from '@/lib/locale-path'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { FOCUS, HARD_EDGE, ordinal } from './marks'

type Locale = Parameters<typeof localePath>[1]

/**
 * The brackets are ornament, not content. Marked aria-hidden so a screen
 * reader announces "Services", not "left square bracket Services right square
 * bracket" four times in a row.
 */
const Bracketed = ({ children }: { children: string }) => (
  <>
    <span aria-hidden="true">[</span>
    <span className="px-1.5">{children}</span>
    <span aria-hidden="true">]</span>
  </>
)

const LINK_BASE = cn(
  'inline-flex min-h-11 items-center px-2 text-(length:--text-sm) font-bold uppercase tracking-[0.14em]',
  FOCUS,
)

/**
 * The current page is marked by inverting the block, not by tinting the text.
 * `surface-inverted` / `text-inverted` are a measured pair in both themes, so
 * this stays legible where a lighter tint would not.
 */
const ACTIVE = 'bg-(--surface-inverted) text-(--text-inverted)'
const IDLE = 'text-(--text-primary) hover:underline hover:decoration-2 hover:underline-offset-4'

export const MainNav = ({ locale }: { locale: Locale }) => {
  const { t } = useTranslation('common')

  return (
    <nav
      aria-label={t('a11y.mainNavigation')}
      className="-ml-2 flex flex-wrap items-center"
    >
      {NAV_LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={localePath(link.to, locale)}
          end
          className={({ isActive }) => cn(LINK_BASE, isActive ? ACTIVE : IDLE)}
        >
          <Bracketed>{t(link.labelKey)}</Bracketed>
        </NavLink>
      ))}
    </nav>
  )
}

/** Milliseconds between one row's entrance and the next. */
const STAGGER_MS = 40

/**
 * The menu under the header on a small screen.
 *
 * It stays in the page and animates both ways: the panel grows open (grid
 * rows from 0fr to 1fr, so it needs no fixed height), fades in, and its rows
 * arrive one after another; closing plays it back. Mounting it only when open
 * made it appear in a single frame, which read as a blink.
 *
 * Closed, it is `inert` and `aria-hidden`, so nothing in it can be focused,
 * clicked or read out. Reduced motion zeroes the transitions in `index.css`,
 * so it then simply appears and disappears.
 */
export const MobileMenu = ({
  id,
  open,
  locale,
  onNavigate,
}: {
  id: string
  open: boolean
  locale: Locale
  onNavigate: () => void
}) => {
  const { t } = useTranslation('common')

  // Each item's delay, counting the bottom row as the last item.
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
        'grid transition-[grid-template-rows,opacity] duration-300 ease-(--ease-out-soft) md:hidden',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="border-t-2 border-(--border-strong)">
          <Container className="py-4">
            <nav aria-label={t('a11y.mainNavigation')} className="flex flex-col">
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
                      'flex min-h-14 items-center gap-4 border-b-2 border-(--border-subtle) px-2 text-(length:--text-base) font-bold uppercase tracking-[0.14em]',
                      FOCUS,
                      isActive ? ACTIVE : 'text-(--text-primary)',
                    )
                  }
                >
                  {/* No colour of its own: the active row inverts, and a number
                      pinned to `text-secondary` would vanish into it. */}
                  <span
                    aria-hidden="true"
                    className="text-(length:--text-sm) font-bold tabular-nums"
                  >
                    {ordinal(index + 1)}
                  </span>
                  <span>{t(link.labelKey)}</span>
                </NavLink>
              ))}
            </nav>

            <div
              style={item(NAV_LINKS.length)}
              className={cn(itemClass, 'mt-5 flex flex-wrap items-center gap-3')}
            >
              <LanguageSwitcher />
              <ButtonLink
                to={localePath(ROUTES.contact, locale)}
                size="sm"
                className={HARD_EDGE}
              >
                {t('cta.contactUs')}
              </ButtonLink>
            </div>
          </Container>
        </div>
      </div>
    </div>
  )
}
