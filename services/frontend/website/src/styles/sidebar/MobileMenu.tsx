import type { CSSProperties } from 'react'

import { cn } from '@/lib/cn'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { NavList } from './NavList'
import { RailContact } from './RailContact'

/** Milliseconds between one block's entrance and the next. */
const STAGGER_MS = 60

/** Delay before the first block starts moving, once the panel has begun to fade in. */
const FIRST_DELAY_MS = 80

/**
 * The rail, below lg, as a full-height overlay under the top bar.
 *
 * It is always in the page and animates both ways: the overlay fades in while
 * sliding down a few pixels, and its three blocks (navigation, contact,
 * language) arrive one after another; closing plays it back with no delay.
 * Mounting it only when open made it appear in a single frame, which read as
 * a blink.
 *
 * Closed, it is `inert`, `aria-hidden` and `pointer-events-none`, so nothing
 * in it can be focused, clicked or read out. Reduced motion zeroes the
 * transitions in `index.css`, so it then simply appears and disappears.
 *
 * `top-14` matches the bar's height exactly, so the bar and its close button
 * stay visible and tappable while the menu is open. `z-50` puts it above the
 * WhatsApp bubble and the back-to-top button, which sit at `z-40` and would
 * otherwise float over the navigation.
 *
 * The page behind is frozen by `useScrollLock` inside `useMobileMenu`, which
 * is gated on `open`, so a closed menu locks nothing.
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
  const item = (index: number): CSSProperties => ({
    transitionDelay: open ? `${FIRST_DELAY_MS + index * STAGGER_MS}ms` : '0ms',
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
        'fixed inset-x-0 bottom-0 top-14 z-50 overflow-y-auto border-t border-(--border-subtle) bg-(--surface-page) lg:hidden',
        'transition-[opacity,translate] duration-300 ease-(--ease-out-soft)',
        open ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0',
      )}
    >
      <div style={item(0)} className={cn(itemClass, 'p-4')}>
        <NavList onNavigate={onNavigate} />
      </div>

      <div style={item(1)} className={itemClass}>
        <RailContact />
      </div>

      <div
        style={item(2)}
        className={cn(itemClass, 'border-t border-(--border-subtle) px-4 py-4')}
      >
        <LanguageSwitcher />
      </div>
    </div>
  )
}
