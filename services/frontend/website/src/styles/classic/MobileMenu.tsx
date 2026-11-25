import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'

import { NAV_LINKS } from '@/config/site'
import { cn } from '@/lib/cn'
import { localePath } from '@/lib/locale-path'
import { Container } from '@/components/ui/Container'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { RegisterButton } from '@/components/layout/RegisterButton'

/** Milliseconds between one link's entrance and the next. */
const STAGGER_MS = 40

/**
 * The menu under the header on a small screen.
 *
 * It stays mounted and animates both ways: the panel grows open (grid rows
 * from 0fr to 1fr, so it needs no fixed height), fades in, and its links
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
  locale: Parameters<typeof localePath>[1]
  onNavigate: () => void
}) => {
  const { t } = useTranslation('common')

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
        'grid transition-[grid-template-rows,opacity] duration-300 ease-(--ease-out-soft) lg:hidden',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="border-t border-(--border-subtle) bg-(--surface-page)">
          <Container>
            <nav aria-label={t('a11y.mainNavigation')} className="flex flex-col py-3">
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
                      'flex min-h-12 items-center rounded-(--radius-md) px-3 text-(length:--text-lg) font-medium',
                      isActive
                        ? 'text-(--text-accent)'
                        : 'text-(--text-primary) hover:bg-(--surface-sunken)',
                    )
                  }
                >
                  {t(link.labelKey)}
                </NavLink>
              ))}

              <div
                style={item(NAV_LINKS.length)}
                className={cn(
                  itemClass,
                  'mt-3 flex items-center justify-between gap-3 border-t border-(--border-subtle) pt-4',
                )}
              >
                <LanguageSwitcher />
                <RegisterButton />
              </div>
            </nav>
          </Container>
        </div>
      </div>
    </div>
  )
}
