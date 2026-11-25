import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * The drifting wash behind a hero or a page header.
 *
 * Entirely decorative and entirely `aria-hidden`: nothing on the page depends
 * on seeing it, and a screen reader is told nothing about it. That is what lets
 * it move at all. Anything readable that drifts is a WCAG 2.2.2 problem.
 *
 * The parent needs `relative` and `overflow-hidden`, and the content on top of
 * it needs `relative` of its own. No z-index: a negative one would drop the
 * wash behind the section's own background and it would never be seen.
 *
 * It is deliberately larger than its box and clipped by it, because a soft
 * edge that ends inside the viewport reads as a mistake rather than as light.
 *
 * `.animate-drift` is 24s, alternating, and the base layer zeroes its duration
 * under prefers-reduced-motion, so there is nothing to check here.
 */
export const Wash = ({ className }: { className?: string }) => (
  <div
    aria-hidden="true"
    className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
  >
    <div className="animate-drift absolute inset-x-[-15%] top-[-35%] h-[85%] rounded-[50%] bg-(--surface-accent-soft) opacity-90 blur-3xl" />
    <div className="absolute inset-0 bg-dot-grid text-(--border-accent-soft) opacity-60" />
    {/* Fades the wash into the page rather than ending it on a hard line, so
        the hero and the section under it read as one continuous surface. */}
    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-(--surface-page)" />
  </div>
)

/**
 * A soft accent halo behind a primary call to action.
 *
 * A separate absolutely positioned element rather than a `shadow-[...]` on the
 * button itself: `cn` joins class names and does not merge them, so a shadow
 * utility passed into `ButtonLink` would collide with the one the button
 * already carries and which of the two wins would depend on Tailwind's output
 * order. This is deterministic, and it is also the only place on the site where
 * the accent is used as light rather than as ink.
 *
 * The halo is inset by 8px, well inside the container gutter, so it cannot
 * paint past the edge of a 320px screen.
 */
export const Glow = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span className={cn('relative inline-flex', className)}>
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -inset-2 rounded-(--radius-xl) bg-(--surface-accent-soft) opacity-90 blur-lg"
    />
    <span className="relative inline-flex">{children}</span>
  </span>
)
