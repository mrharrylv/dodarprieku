import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { MAIN_CONTENT_ID } from '@/config/dom'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/ui/Icon'

/**
 * Back to the top of the page, once there is somewhere to come back from.
 *
 * Not rendered at all until the visitor has scrolled a full viewport: a button
 * that is present but invisible is still a tab stop, and a keyboard user would
 * land on something they cannot see.
 *
 * Scrolls smoothly unless the visitor has asked for reduced motion, then moves
 * focus to `main` so the next Tab starts at the top rather than from a button
 * that has just left the screen.
 *
 * `raised` lifts it clear of the WhatsApp bubble when that is rendered too.
 */
export const BackToTop = ({ raised = false }: { raised?: boolean }) => {
  const { t } = useTranslation('common')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const update = () => setVisible(window.scrollY > window.innerHeight)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  if (!visible) return null

  const onClick = () => {
    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    window.scrollTo({ top: 0, behavior: reduce ? 'instant' : 'smooth' })
    document.getElementById(MAIN_CONTENT_ID)?.focus({ preventScroll: true })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('nav.scrollToTop')}
      className={cn(
        'fixed right-5 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full',
        'border border-(--border-strong) bg-(--surface-raised) text-(--text-secondary)',
        'shadow-(--shadow-lifted) transition-colors hover:text-(--text-primary) sm:right-6',
        raised ? 'bottom-22 sm:bottom-24' : 'bottom-5 sm:bottom-6',
      )}
    >
      <Icon name="arrowUp" />
    </button>
  )
}
