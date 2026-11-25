import { Link } from 'react-router-dom'

import { ROUTES, SITE } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { cn } from '@/lib/cn'
import { localePath } from '@/lib/locale-path'

/**
 * The brand, drawn the way an application draws it: an accent tile carrying
 * the initial, then the wordmark.
 *
 * The tile is `aria-hidden` because the wordmark beside it already says the
 * name. Marking up both is how a screen reader ends up announcing "S Dodar prieku".
 */
export const Brand = ({ className }: { className?: string }) => {
  const { locale } = useLocale()

  return (
    <Link
      to={localePath(ROUTES.home, locale)}
      className={cn('inline-flex min-h-11 items-center gap-2.5', className)}
    >
      <span
        aria-hidden="true"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-(--radius-md) bg-(--fill-accent) font-(family-name:--font-display) text-(length:--text-sm) font-semibold text-(--text-on-accent)"
      >
        {SITE.name.slice(0, 1)}
      </span>
      <span className="truncate font-(family-name:--font-display) text-(length:--text-lg) font-semibold tracking-tight text-(--text-primary)">
        {SITE.name}
      </span>
    </Link>
  )
}
