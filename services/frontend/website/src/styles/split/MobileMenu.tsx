import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'

import { NAV_LINKS, ROUTES } from '@/config/site'
import { cn } from '@/lib/cn'
import { localePath } from '@/lib/locale-path'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { ButtonLink } from '@/components/ui/Button'
import { NavList } from './NavList'

/** Milliseconds between one row's entrance and the next. */
const STAGGER_MS = 40
/** Milliseconds before the first row starts, so the panel leads. */
const FIRST_DELAY_MS = 80
/** Delay of one row; the bottom row counts as the one after the links. */
const itemDelay = (open: boolean, index: number): CSSProperties => ({
  transitionDelay: open ? `${FIRST_DELAY_MS + index * STAGGER_MS}ms` : '0ms',
})

/**
 * The drop-down under the phone bar.
 *
 * It stays mounted and animates both ways: the panel grows open (grid rows
 * from 0fr to 1fr, so it needs no fixed height), fades in, and its rows
 * arrive one after another; closing plays it back. Mounting it only while
 * open made it appear in a single frame, which read as a blink.
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

  const motion = cn(
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
        <div className="border-t border-(--border-subtle) bg-(--surface-sunken) px-5 pb-6 sm:px-8">
          <NavList
            size="menu"
            onNavigate={onNavigate}
            itemClassName={motion}
            itemStyle={(index) => itemDelay(open, index)}
          />
          <div
            style={itemDelay(open, NAV_LINKS.length)}
            className={cn('mt-6 flex flex-wrap items-center justify-between gap-3', motion)}
          >
            <LanguageSwitcher />
            <ButtonLink to={localePath(ROUTES.contact, locale)}>{t('cta.contactUs')}</ButtonLink>
          </div>
        </div>
      </div>
    </div>
  )
}
