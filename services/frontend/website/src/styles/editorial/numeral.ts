/**
 * Two digits, always: 01, 02, 03.
 *
 * A single digit set at display size reads as a stray character rather than a
 * mark, and zero padding keeps the left gutter the same width on every row, so
 * the titles beside them line up.
 */
export const numeral = (index: number) => String(index + 1).padStart(2, '0')
