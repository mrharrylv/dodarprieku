import { cn } from '@/lib/cn'

/**
 * The one oval shape of the map's top bar: the category chips and
 * "+ Kļūt par saņēmēju" share it, so they line up at the same height and radius.
 * 44px tall, the touch-target floor.
 */
const PILL_FACE = cn(
  'inline-flex shrink-0 items-center rounded-full border',
  'text-(length:--text-sm) font-medium',
  'transition-[color,background-color,border-color,box-shadow] duration-150',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring-accent)',
)

export const PILL = cn(PILL_FACE, 'h-11 whitespace-nowrap')

/**
 * The same pill where a long label may wrap onto a second line rather than
 * run past its row: the category chips laid out all at once, on a phone.
 */
export const WRAPPING_PILL = cn(PILL_FACE, 'h-auto min-h-11 max-w-full py-1 text-left whitespace-normal')

/** A floating, see-through surface over the map: what the search and each chip sit on. */
export const GLASS = 'bg-(--surface-raised)/75 shadow-(--shadow-card) backdrop-blur-md backdrop-saturate-150'

/**
 * The accent pill: "+ Kļūt par saņēmēju", and "Pieprasīt profilu" on a
 * card, which asks for the same thing (a profile of one's own) and so looks
 * the same.
 */
export const ACCENT_PILL = cn(
  PILL,
  'font-semibold',
  'border-transparent bg-(--fill-accent) text-(--text-on-accent) shadow-(--shadow-card) hover:bg-(--fill-accent-hover) hover:shadow-(--shadow-lifted)',
)
