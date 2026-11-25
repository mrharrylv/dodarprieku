import type { SVGProps } from 'react'

import { cn } from '@/lib/cn'

/**
 * The site's icon set, inline.
 *
 * Inline SVG rather than an icon font or a CDN sprite, for the same reason the
 * fonts are self-hosted: the cookie and privacy policies promise the site makes
 * no third-party request, and an icon CDN would make that promise false on the
 * first paint. A webfont would also render as a box in the gap before it loads.
 *
 * Every icon is decorative: it sits beside text that already says the same
 * thing, so it is `aria-hidden` with no title, and colour is never the only
 * signal. Stroke icons are drawn on a 24 unit grid with a round cap and
 * inherit `currentColor` and the surrounding font size. `whatsapp` is the
 * brand glyph and is filled rather than stroked.
 */
export type IconName =
  | 'arrowRight'
  | 'arrowUp'
  | 'building'
  | 'check'
  | 'chevronDown'
  | 'close'
  | 'flag'
  | 'heart'
  | 'info'
  | 'mail'
  | 'menu'
  | 'moon'
  | 'phone'
  | 'pin'
  | 'plus'
  | 'sparkle'
  | 'sun'
  | 'ticket'
  | 'trophy'
  | 'user'
  | 'whatsapp'

const STROKES: Record<Exclude<IconName, 'whatsapp'>, string> = {
  arrowRight: 'M5 12h13M12 6l6 6-6 6',
  arrowUp: 'M12 19V5M6 11l6-6 6 6',
  building: 'M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M15 10h3a1 1 0 0 1 1 1v10M3 21h18M9 8h2M9 12h2M9 16h2',
  check: 'M5 12.5l4.5 4.5L19 7',
  chevronDown: 'M6 9l6 6 6-6',
  close: 'M6 6l12 12M18 6L6 18',
  flag: 'M5 21V4m0 0h11l-2 4 2 4H5',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-10v5m0-8.5v.5',
  mail: 'M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm-.6.4 8.6 6.4 8.6-6.4',
  menu: 'M4 7h16M4 12h16M4 17h16',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z',
  phone:
    'M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L14 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z',
  pin: 'M12 21s6-5.5 6-11a6 6 0 1 0-12 0c0 5.5 6 11 6 11Zm0-9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  plus: 'M12 5v14M5 12h14',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z',
  ticket: 'M4 7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v3a2 2 0 0 0 0 4v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a2 2 0 0 0 0-4V7Zm10-1v12',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0V4Zm0 2H5a3 3 0 0 0 3 4m8-4h3a3 3 0 0 1-3 4m-4 3v4m-4 3h8m-6 0 .5-3h3l.5 3',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-15v2m0 16v2M4.2 4.2l1.4 1.4m12.8 12.8 1.4 1.4M2 12h2m16 0h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
}

/** The WhatsApp glyph, from Simple Icons, licensed CC0. */
const WHATSAPP =
  'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z'

export const Icon = ({
  name,
  className,
  ...rest
}: { name: IconName; className?: string } & Omit<SVGProps<SVGSVGElement>, 'name' | 'className'>) => {
  const shared = {
    viewBox: '0 0 24 24',
    className: cn('h-[1.25em] w-[1.25em] shrink-0', className),
    'aria-hidden': true,
    focusable: false,
    ...rest,
  } satisfies SVGProps<SVGSVGElement>

  if (name === 'whatsapp') {
    return (
      <svg {...shared} fill="currentColor">
        <path d={WHATSAPP} />
      </svg>
    )
  }

  return (
    <svg
      {...shared}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={STROKES[name]} />
    </svg>
  )
}
