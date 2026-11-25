import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/cn'
import { Icon } from '@/components/ui/Icon'

/**
 * The grid every page in this style is built from.
 *
 * One column on a phone, six on a tablet, twelve on a desktop. Tiles are
 * placed in the DOM in the order they should be READ and given their width
 * with a span class, never with `order-*` or an explicit column start: a grid
 * that moves a tile visually past its neighbours leaves the tab order behind
 * it, and a keyboard visitor then jumps around the page at random.
 *
 * No tile carries a base-width class. In a one-column grid a `col-span-12`
 * does not clamp, it creates eleven implicit columns and scrolls the phone
 * sideways, which is exactly the failure `overflow.test.ts` exists for.
 */
export const TileGrid = ({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) => (
  <div
    className={cn(
      'grid grid-cols-1 gap-3 sm:grid-cols-6 sm:gap-4 lg:grid-cols-12',
      className,
    )}
  >
    {children}
  </div>
)

type Tone = 'raised' | 'accent' | 'quiet'

const TONES: Record<Tone, string> = {
  raised: 'border-(--border-subtle) bg-(--surface-raised)',
  accent: 'border-(--border-accent-soft) bg-(--surface-accent-soft)',
  quiet: 'border-(--border-subtle) bg-(--surface-sunken)',
}

/* A tile is a surface, a big corner and a hairline. No shadow: eleven shadowed
   tiles on one screen read as a pile of paper rather than a grid, and
   tokens.css zeroes the shadow tokens for the same reason. */
const TILE = 'flex flex-col rounded-(--radius-xl) border p-6 sm:p-7'

export const Tile = ({
  id,
  tone = 'raised',
  className,
  children,
}: {
  id?: string
  tone?: Tone
  className?: string
  children: ReactNode
}) => (
  <div id={id} className={cn(TILE, TONES[tone], className)}>
    {children}
  </div>
)

/**
 * A tile that is entirely one link.
 *
 * One anchor around the whole tile, not a heading link plus a "read more":
 * three tab stops that all go to the same place is the standard way a card
 * grid becomes tiring to cross by keyboard. The hover and focus treatment is
 * on this element, so the target and the affordance are the same rectangle.
 */
export const TileLink = ({
  to,
  tone = 'raised',
  className,
  children,
}: {
  to: string
  tone?: Tone
  className?: string
  children: ReactNode
}) => (
  <Link
    to={to}
    className={cn(
      TILE,
      TONES[tone],
      'group transition-colors duration-200 ease-(--ease-out-soft)',
      'hover:border-(--border-strong)',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring-accent)',
      'focus-visible:ring-offset-2 focus-visible:ring-offset-(--surface-sunken)',
      className,
    )}
  >
    {children}
  </Link>
)

/** The tiny uppercase line at the top of a tile. On the home page it names the
    destination the tile leads to, which is what makes the grid a map. */
export const TileEyebrow = ({ children }: { children: ReactNode }) => (
  <p className="text-(length:--text-xs) font-semibold uppercase tracking-[0.16em] text-(--text-muted)">
    {children}
  </p>
)

/** A two-digit index. Decorative: the heading beside it already says what the
    tile is, so a screen reader gains nothing from hearing "zero three". */
export const TileNumber = ({ index }: { index: number }) => (
  <span
    aria-hidden="true"
    className="font-(family-name:--font-display) text-(length:--text-sm) font-semibold tabular-nums text-(--text-accent)"
  >
    {String(index + 1).padStart(2, '0')}
  </span>
)

/**
 * The call-to-action line at the foot of a link tile. A span, never an anchor:
 * the tile around it is already the link.
 */
export const TileCue = ({ children }: { children: ReactNode }) => (
  <span className="mt-auto inline-flex items-center gap-2 pt-6 text-(length:--text-sm) font-semibold text-(--text-accent)">
    {children}
    <Icon
      name="arrowRight"
      className="h-4 w-4 transition-transform duration-200 ease-(--ease-out-soft) group-hover:translate-x-1"
    />
  </span>
)
