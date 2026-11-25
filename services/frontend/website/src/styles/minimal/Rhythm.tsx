import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/cn'
import { Container } from '@/components/ui/Container'
import { Icon } from '@/components/ui/Icon'

/**
 * The rhythm IS the design here, so every gap in the reading column is
 * declared once, in this file, and the pages only choose which piece they
 * want. (The masthead and the footer keep their own, in their own files.)
 *
 * The scale, and there is no other:
 *
 *   6rem between blocks, 9rem from sm up
 *   2.5rem inside a ruled row, and above the row a block ends on
 *   2rem under a page title, and from a block heading to its list
 *   1.5rem from a block heading to a standalone paragraph
 *   1rem from a block heading to its framing line, and from a marker to the
 *     heading under it
 *   0.75rem from a row heading to its body copy
 *
 * Type one of those numbers into a page instead and the column stops being a
 * column, which is the only thing holding this style together. So the four
 * pages carry no spacing utility at all: they pick a piece from here, and the
 * piece brings the gap above itself.
 */

/**
 * The air a ruled row keeps around its content. Written once because a row
 * whose whole surface is a link supplies it from the link instead, and the two
 * have to stay the same height.
 */
const ROW_PADDING = 'py-10'

/**
 * The page column: the width, the top air above the h1 and the long run-out
 * to the footer. Every page opens with exactly one of these, and no page sets
 * its own top padding, or the first line would sit at a different height on
 * each one.
 */
export const Page = ({ children }: { children: ReactNode }) => (
  <Container className="pt-16 pb-28 sm:pt-28 sm:pb-40">{children}</Container>
)

/** One block of the page. The gap above it is the same on every page. */
export const Block = ({ children }: { children: ReactNode }) => (
  <section className="mt-24 sm:mt-36">{children}</section>
)

/**
 * The page's one h1. `hero` is the home page, which is the only title set at
 * the largest step and the only one that follows an eyebrow, so it carries the
 * gap under it.
 */
export const PageTitle = ({
  hero = false,
  children,
}: {
  hero?: boolean
  children: ReactNode
}) => (
  <h1
    className={cn(
      'max-w-[18ch] text-balance break-words font-semibold tracking-tight text-(--text-primary)',
      hero
        ? 'mt-6 text-(length:--text-5xl) leading-[1.05]'
        : 'text-(length:--text-4xl) leading-[1.08]',
    )}
  >
    {children}
  </h1>
)

/** The line under a page title. Every page has exactly one. */
export const Lede = ({ children }: { children: ReactNode }) => (
  <p className="mt-8 max-w-[52ch] text-(length:--text-lg) leading-relaxed text-(--text-secondary)">
    {children}
  </p>
)

/** A block's heading and its one framing line. */
export const BlockIntro = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <>
    <h2 className="max-w-[24ch] text-(length:--text-2xl) font-semibold tracking-tight text-(--text-primary)">
      {title}
    </h2>
    {subtitle !== undefined && (
      <p className="mt-4 max-w-[52ch] text-(length:--text-lg) leading-relaxed text-(--text-secondary)">
        {subtitle}
      </p>
    )}
  </>
)

/** The micro label above a heading. Uppercase and letterspaced, never bold. */
export const Eyebrow = ({ children }: { children: ReactNode }) => (
  <p className="text-(length:--text-xs) uppercase tracking-[0.22em] text-(--text-muted)">
    {children}
  </p>
)

/**
 * The list index, as 01 / 02 / 03.
 *
 * Decorative and aria-hidden: it is a position, not content, and a screen
 * reader already announces the list position.
 */
export const Marker = ({ index }: { index: number }) => (
  <span
    aria-hidden="true"
    className="block text-(length:--text-xs) uppercase tracking-[0.22em] text-(--text-muted)"
  >
    {String(index + 1).padStart(2, '0')}
  </span>
)

/**
 * A ruled list: the one place this style draws a line, because without it a
 * run of heading-plus-paragraph reads as one long undifferentiated column.
 * The rule sits on top of each row, including the first, so the list is
 * framed by the heading above it and left open at the bottom.
 */
export const RuledList = ({
  ordered = false,
  children,
}: {
  ordered?: boolean
  children: ReactNode
}) =>
  // Written as two elements rather than a dynamic tag so the intrinsic type
  // stays exact, and because a numbered process really is an ordered list.
  ordered ? (
    <ol className="mt-8">{children}</ol>
  ) : (
    <ul className="mt-8">{children}</ul>
  )

/**
 * A row of a ruled list. `flush` when the row's own child supplies the padding,
 * for example a RowLink that fills the whole row.
 *
 * scroll-mt is small because the header does not stick: it is breathing room
 * for an anchor landing, not clearance under a floating bar.
 */
export const RuledItem = ({
  id,
  flush = false,
  children,
}: {
  id?: string
  flush?: boolean
  children: ReactNode
}) => (
  <li
    {...(id !== undefined ? { id } : {})}
    className={cn('scroll-mt-8 border-t border-(--border-subtle)', !flush && ROW_PADDING)}
  >
    {children}
  </li>
)

/**
 * A whole row that is a link: a large target, and nothing has to be drawn
 * around it to say so. It takes the row padding itself, so it is exactly as
 * tall as a plain row, and its heading underlines on hover.
 */
export const RowLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link to={to} className={cn('group block transition-colors', ROW_PADDING)}>
    {children}
  </Link>
)

/**
 * The heading of a ruled row, set under its marker.
 *
 * `level` is 2 on the services page, where the list has no heading of its own
 * and each service is a section of the page, and 3 everywhere else, where the
 * list sits under a block heading. Two elements rather than a dynamic tag, for
 * the same reason as RuledList.
 */
export const RowTitle = ({
  level = 3,
  link = false,
  children,
}: {
  level?: 2 | 3
  link?: boolean
  children: ReactNode
}) =>
  level === 2 ? (
    <h2 className="mt-4 text-(length:--text-2xl) font-semibold tracking-tight text-(--text-primary)">
      {children}
    </h2>
  ) : (
    <h3
      className={cn(
        'text-(length:--text-xl) font-semibold tracking-tight text-(--text-primary)',
        // Inside a RowLink there is no marker above it and the whole row is
        // the target, so it opens the row and underlines with it.
        link ? 'decoration-1 underline-offset-[6px] group-hover:underline' : 'mt-4',
      )}
    >
      {children}
    </h3>
  )

/**
 * The summary line of a ruled row, in full-strength ink: the services page
 * says the short version here and the long version in the body under it.
 */
export const RowLede = ({ children }: { children: ReactNode }) => (
  <p className="mt-3 max-w-[52ch] text-(length:--text-lg) leading-relaxed text-(--text-primary)">
    {children}
  </p>
)

/** The body copy of a ruled row. */
export const RowBody = ({ children }: { children: ReactNode }) => (
  <p className="mt-3 max-w-[58ch] leading-relaxed text-(--text-secondary)">{children}</p>
)

/**
 * A standalone paragraph inside a block, at reading width.
 *
 * whitespace-pre-line so a copywriter can put a blank line in the locale file
 * and get a paragraph break, without HTML in a string.
 */
export const Prose = ({ children }: { children: ReactNode }) => (
  <p className="mt-6 max-w-[58ch] whitespace-pre-line text-(length:--text-lg) leading-relaxed text-(--text-secondary)">
    {children}
  </p>
)

/**
 * The row a block ends on: one filled button, sometimes a text link beside it.
 * The same gap above it whether it follows a paragraph, a list or a heading.
 */
export const Actions = ({ children }: { children: ReactNode }) => (
  <div className="mt-10 flex flex-wrap items-center gap-x-10 gap-y-2">{children}</div>
)

/** A text link on its own line, following a list or a paragraph. */
export const TextLinkRow = ({ children }: { children: ReactNode }) => (
  <div className="mt-8">{children}</div>
)

/**
 * The secondary action everywhere in this style. It is a text link, not a
 * button, so the one filled button on a page stays the obvious thing to click,
 * and min-h-11 keeps it a 44px target even though it reads as a line of text.
 */
export const TextLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link
    to={to}
    className="group inline-flex min-h-11 items-center gap-2 text-(length:--text-base) font-medium text-(--text-accent) underline decoration-1 underline-offset-[6px] transition-colors hover:text-(--text-primary)"
  >
    {children}
    <Icon
      name="arrowRight"
      className="h-4 w-4 transition-transform ease-(--ease-out-soft) group-hover:translate-x-1"
    />
  </Link>
)
