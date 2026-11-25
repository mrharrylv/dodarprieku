/**
 * The three marks every brutalist surface is built from.
 *
 * They live in one file because the look only holds together if the button on
 * the home page and the button in the mobile menu carry the *same* offset. A
 * hand-copied class string drifts by a pixel and the whole thing reads sloppy
 * rather than deliberate.
 */

/**
 * A rectangle with a hard border and a solid offset shadow: no blur, no alpha,
 * a token colour placed 5px down and right. Hovering presses it into the page.
 *
 * The trailing `!` is load-bearing. The shared `Button` sets its own
 * `--shadow-*`, which this style has set to `none`; without the important
 * marker the offset can lose the cascade and the button goes flat.
 *
 * No `transition-*` or `duration-*` here on purpose. Every element this lands
 * on is the shared `Button`, whose recipe already transitions box-shadow and
 * transform over 200ms, and `cn` is a plain join with no conflict resolution:
 * a second duration on the same element is decided by stylesheet order rather
 * than by this file. One declaration, in one place, so the press is 200ms and
 * the easing is this style's `linear`.
 */
export const HARD_EDGE =
  'min-h-11 border-2 border-(--border-strong) [box-shadow:5px_5px_0_0_var(--border-strong)]! hover:translate-x-[2px] hover:translate-y-[2px] hover:[box-shadow:2px_2px_0_0_var(--border-strong)]!'

/** An uppercase kicker. Wide tracking is what makes mono read as a label. */
export const LABEL =
  'text-(length:--text-xs) font-bold uppercase tracking-[0.22em] text-(--text-secondary)'

/** A section or item number. Tabular so 01 and 10 occupy the same width. */
export const NUM =
  'text-(length:--text-sm) font-bold tabular-nums text-(--text-secondary)'

/**
 * A thicker focus ring than the base layer draws. Brutalism is the aesthetic
 * most likely to hide focus in the name of rawness, so this style goes the
 * other way: 4px, offset, on every control the style draws itself.
 */
export const FOCUS =
  'focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-(--ring-accent)'

/** 1 becomes "01". The zero is the whole point. */
export const ordinal = (n: number) => String(n).padStart(2, '0')
