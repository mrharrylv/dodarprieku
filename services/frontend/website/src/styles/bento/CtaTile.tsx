import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { cn } from '@/lib/cn'
import { ButtonLink } from '@/components/ui/Button'
import { Tile } from './Tile'
import { SPAN_FULL } from './spans'

/**
 * The tile every page ends on: one accent rectangle the width of the grid.
 *
 * Three pages need the same shape with different copy, so it lives here rather
 * than being retyped. The heading is always an h2, because it always follows
 * the page's h1 and never wraps anything.
 */
export const CtaTile = ({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action: string
}) => {
  const { locale } = useLocale()

  return (
    <Tile tone="accent" className={cn(SPAN_FULL, 'mt-4 sm:mt-6 sm:p-10')}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 max-w-xl">
          <h2 className="text-(length:--text-2xl) font-semibold tracking-tight text-(--text-primary)">
            {title}
          </h2>
          <p className="mt-3 text-(--text-secondary)">{body}</p>
        </div>
        <ButtonLink
          to={localePath(ROUTES.contact, locale)}
          size="lg"
          className="shrink-0"
        >
          {action}
        </ButtonLink>
      </div>
    </Tile>
  )
}
