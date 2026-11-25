import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/cn'
import { Icon } from '@/components/ui/Icon'

type Tone = 'raised' | 'accent'

const TONES: Record<Tone, string> = {
  raised: 'border-(--border-subtle) bg-(--surface-raised)',
  accent: 'border-(--border-accent-soft) bg-(--surface-accent-soft)',
}

/**
 * The card of this style: a hairline edge, a small radius, no shadow, and
 * `p-5` rather than `p-7`.
 *
 * Flat on purpose. A rail already separates the furniture from the content, so
 * a lifted shadow on every panel adds depth the layout does not need and makes
 * a dense page look busy.
 *
 * The tint is a `tone` prop rather than a colour passed through `className`:
 * `cn` here is a plain join, not tailwind-merge, so two utilities setting the
 * same property would be resolved by the order Tailwind happened to emit them
 * in, which is not something to bet a background colour on.
 */
export const Panel = ({
  tone = 'raised',
  className,
  children,
}: {
  tone?: Tone
  className?: string
  children: ReactNode
}) => (
  <div className={cn('rounded-(--radius-lg) border p-5', TONES[tone], className)}>
    {children}
  </div>
)

/**
 * A two-digit marker: `01`, `02`. Always `aria-hidden`, because the order is
 * already carried by the list it sits in, and a screen reader reading "zero
 * one" before every heading is noise.
 */
export const NumberChip = ({ n, className }: { n: number; className?: string }) => (
  <span
    aria-hidden="true"
    className={cn(
      'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-(--radius-sm)',
      'bg-(--surface-accent-soft) font-(family-name:--font-display)',
      'text-(length:--text-xs) font-semibold tabular-nums text-(--text-accent)',
      className,
    )}
  >
    {String(n).padStart(2, '0')}
  </span>
)

/**
 * A whole row that is one link: title, one line of summary, an arrow.
 *
 * Rows stacked behind one border scan faster than a grid of cards once there
 * are more than three of them, and the entire row is the target, so there is
 * exactly one tab stop and a thumb-sized tap area.
 */
export const RowLink = ({
  to,
  title,
  children,
}: {
  to: string
  title: string
  children: ReactNode
}) => (
  <Link
    to={to}
    className="group flex min-h-11 items-start gap-4 px-5 py-4 transition-colors hover:bg-(--surface-sunken)"
  >
    {/* A div, not a span: a span may only hold phrasing content, and the
        heading below is flow content. The anchor itself is fine either way,
        its content model is transparent. */}
    <div className="min-w-0 flex-1">
      {/* A heading inside the anchor, as CardLink does it: the row is one tab
          stop, and the services still appear in the document outline. */}
      <h3 className="text-(length:--text-lg) text-(--text-primary) group-hover:text-(--text-accent)">
        {title}
      </h3>
      <p className="mt-1 text-(length:--text-sm) text-(--text-secondary)">{children}</p>
    </div>
    <Icon
      name="arrowRight"
      className="mt-1.5 h-4 w-4 shrink-0 text-(--text-muted) transition-transform duration-200 ease-(--ease-out-soft) group-hover:translate-x-1 group-hover:text-(--text-accent)"
    />
  </Link>
)
