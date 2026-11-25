import { cn } from '@/lib/cn'

/**
 * The one oval shape of the map's top bar: the category chips and
 * "+ Kļūt par saņēmēju" share it, so they line up at the same height and radius.
 * 44px tall, the touch-target floor.
 */
export const PILL = cn(
  'inline-flex h-11 shrink-0 items-center rounded-full border',
  'text-(length:--text-sm) font-medium whitespace-nowrap',
  'transition-[color,background-color,border-color,box-shadow] duration-150',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring-accent)',
)

/** A floating, see-through surface over the map: what the search and each chip sit on. */
export const GLASS = 'bg-(--surface-raised)/75 shadow-(--shadow-card) backdrop-blur-md backdrop-saturate-150'
