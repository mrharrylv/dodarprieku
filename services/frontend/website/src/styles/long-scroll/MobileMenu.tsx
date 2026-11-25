import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { NAV_LINKS, ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { cn } from '@/lib/cn'
import { localePath } from '@/lib/locale-path'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { bandNumber } from './sections'

/** Milliseconds between one item's entrance and the next. */
const STAGGER_MS = 40

/**
 * The phone navigation: the four bands as a numbered list at reading scale.
 *
 * It stays mounted and animates both ways: the panel fades and slides down
 * from under the header, and its items arrive one after another; closing
 * plays it back. Mounting it only when open made it appear in a single frame,
 * which read as a blink. Closed, it is `inert`, `aria-hidden` and
 * `pointer-events-none`, so nothing in it can be focused, clicked or read
 * out. The scroll lock and Escape handling live in `useMobileMenu` and apply
 * only while open. Reduced motion zeroes the transitions in `index.css`.
 *
 * It sits below the header instead of over it, so the close button never
 * moves: on a phone the thumb is already there, and a menu that swaps one
 * control for another somewhere else is how people end up tapping a link they
 * did not mean to. `top-16` is that header's height: it only ever shows below
 * `lg`, where Header.tsx is `h-16`.
 */
export const MobileMenu = ({
  id,
  open,
  isCurrent,
  onNavigate,
}: {
  id: string
  open: boolean
  isCurrent: (to: string) => boolean
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
        'fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto border-t border-(--border-subtle) bg-(--surface-page) lg:hidden',
        'transition-[opacity,translate,visibility] duration-300 ease-(--ease-out-soft)',
        open
          ? 'visible translate-y-0 opacity-100'
          : 'pointer-events-none invisible -translate-y-3 opacity-0',
      )}
    >
      <Container className="py-4">
        <nav aria-label={t('a11y.mainNavigation')}>
          <ul>
            {NAV_LINKS.map((link, index) => (
              <li key={link.to} style={item(index)} className={itemClass}>
                <Link
                  to={localePath(link.to, locale)}
                  onClick={onNavigate}
                  aria-current={isCurrent(link.to) ? 'true' : undefined}
                  className={cn(
                    'flex min-h-14 items-center gap-5 border-b border-(--border-subtle) py-3',
                    'font-(family-name:--font-display) text-(length:--text-2xl) font-semibold tracking-tight',
                    isCurrent(link.to) ? 'text-(--text-accent)' : 'text-(--text-primary)',
                  )}
                >
                  {/* Decorative, and hidden so it never joins the link's name. */}
                  <span
                    aria-hidden="true"
                    className="text-(length:--text-sm) font-medium tabular-nums tracking-[0.2em] text-(--text-muted)"
                  >
                    {bandNumber(index + 1)}
                  </span>
                  {t(link.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div
          style={item(NAV_LINKS.length)}
          className={cn(
            itemClass,
            'mt-8 flex flex-wrap items-center justify-between gap-4 pb-8',
          )}
        >
          <LanguageSwitcher />
          <ButtonLink to={localePath(ROUTES.contact, locale)} size="md">
            {t('cta.contactUs')}
          </ButtonLink>
        </div>
      </Container>
    </div>
  )
}
