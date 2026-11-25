import type { CategoryIcon as CategoryIconName } from '@shared/catalog'

/** A circle as path data, so every icon is one `<path>`. */
const circle = (cx: number, cy: number, r: number): string =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`

/**
 * The thirteen category icons, drawn for this site on the same 24 unit grid,
 * stroke and caps as `components/ui/Icon.tsx`, so a pin, a chip and a badge
 * read as one family. Inline SVG: no icon font, no CDN.
 */
export const CATEGORY_ICON_PATHS: Readonly<Record<CategoryIconName, string>> = {
  paw: [
    circle(6.5, 10.5, 1.6),
    circle(10, 6.5, 1.6),
    circle(14, 6.5, 1.6),
    circle(17.5, 10.5, 1.6),
    'M12 12c-2.6 0-5 2.7-5 5.1a2.4 2.4 0 0 0 3 2.3 7 7 0 0 1 4 0 2.4 2.4 0 0 0 3-2.3c0-2.4-2.4-5.1-5-5.1Z',
  ].join(''),
  child: [circle(12, 5.5, 2.5), 'M7 12l2.5-2h5l2.5 2M9.5 10v4.5h5V10M10 14.5V20M14 14.5V20'].join(''),
  elder: [circle(10, 4.5, 2), 'M10 7.5v6l-2.5 6.5M10 13.5l3 6.5M10 9.5l-3 2.5M10 9.5l4 1.5M16 11.5h1v9.5'].join(''),
  hospital: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM12 8v8M8 12h8',
  candle:
    'M9 11h6v9a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-9ZM12 11V9M12 3c1.4 1.4 2 2.5 2 3.3a2 2 0 0 1-4 0c0-.8.6-1.9 2-3.3ZM6.5 21h11',
  shield: 'M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3ZM9 12l2 2 4-4',
  home: 'M4 11l8-7 8 7M6 9.5V20h12V9.5M10 20v-5h4v5',
  soup: 'M3.5 12h17a8.5 8.5 0 0 1-17 0ZM9 20.5h6M9 8.5c-.8-1 .8-2 0-3.5M12 8.5c-.8-1 .8-2 0-3.5M15 8.5c-.8-1 .8-2 0-3.5',
  family: [
    circle(7.5, 6, 2),
    circle(16.5, 6, 2),
    circle(12, 12, 1.5),
    'M4 20v-5a3.5 3.5 0 0 1 6-2.4M20 20v-5a3.5 3.5 0 0 0-6-2.4M10 20v-2.5a2 2 0 0 1 4 0V20',
  ].join(''),
  wheelchair: [circle(11, 4, 1.5), 'M11 7.5V13h5l2.5 5.5H20M11 10h4M8 10.6a5.5 5.5 0 1 0 7.6 6.4'].join(''),
  school: 'M2.5 9L12 4.5 21.5 9 12 13.5 2.5 9ZM6.5 11v4.5c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3V11M21.5 9v5',
  'heart-flag':
    'M5 21V4M5 4h13l-2.5 4.5L18 13H5M11.5 11.2s-2.6-1.4-2.6-3.3a1.4 1.4 0 0 1 2.6-.8 1.4 1.4 0 0 1 2.6.8c0 1.9-2.6 3.3-2.6 3.3Z',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z',
}
