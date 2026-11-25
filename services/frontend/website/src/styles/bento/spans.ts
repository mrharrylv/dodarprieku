/**
 * Where each tile sits on the twelve columns.
 *
 * Its own file, so `Tile.tsx` exports components and nothing else: a module
 * that mixes constants with components loses fast refresh in development, and
 * these are read by every page anyway.
 */

/* Spans are written out in full, because Tailwind reads the source as text:
   a class assembled as `lg:col-span-${n}` is never generated and the tile
   silently falls back to one column. */

/** Fills the row: the page opener, a band label, the closing call to action. */
export const SPAN_FULL = 'sm:col-span-6 lg:col-span-12'
/** The home hero. Wider than half, and two rows tall, so it anchors the map. */
export const SPAN_HERO = 'sm:col-span-6 lg:col-span-7 lg:row-span-2'
/** The two tiles stacked beside the hero, together as tall as it is. */
export const SPAN_BESIDE_HERO = 'sm:col-span-3 lg:col-span-5'
/** Three across on a desktop, two across on a tablet. */
export const SPAN_THIRD = 'sm:col-span-3 lg:col-span-4'

/**
 * One wide tile, then two narrow ones.
 *
 * Three claims of equal weight need something to start the eye, and width is
 * the only tool left once the type is this flat.
 */
export const HIGHLIGHT_SPANS = [
  'sm:col-span-6 lg:col-span-6',
  'sm:col-span-3 lg:col-span-3',
  'sm:col-span-3 lg:col-span-3',
] as const

/** 7 then 5, then 5 then 7. The seam moves between rows, so four services do
    not read as a table of four identical boxes. */
export const SERVICE_SPANS = [
  'sm:col-span-3 lg:col-span-7',
  'sm:col-span-3 lg:col-span-5',
  'sm:col-span-3 lg:col-span-5',
  'sm:col-span-3 lg:col-span-7',
] as const

/** Wraps, so a sixth service or a fourth highlight still gets a width. */
export const spanAt = (spans: readonly string[], index: number): string =>
  spans[index % spans.length] ?? ''
