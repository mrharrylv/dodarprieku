/** Inline SVG icons (no icon font, no CDN). Decorative unless given a label. */
import type { ReactNode } from 'react'

interface IconProps {
  readonly className?: string
  readonly label?: string
}

const Svg = ({ className = 'size-5', label, children }: IconProps & { readonly children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
  >
    {children}
  </svg>
)

type Icon = (props: IconProps) => ReactNode

export const IconClose: Icon = (p) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>
export const IconDashboard: Icon = (p) => (
  <Svg {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></Svg>
)
export const IconInbox: Icon = (p) => (
  <Svg {...p}><path d="M4 13l2.5-8h11L20 13v6H4z" /><path d="M4 13h4.5l1 2h5l1-2H20" /></Svg>
)
export const IconDiff: Icon = (p) => (
  <Svg {...p}><path d="M8 3v12M2 9h12" /><path d="M14 19h8" /><path d="M16 3l4 4-4 4" /></Svg>
)
export const IconBuilding: Icon = (p) => (
  <Svg {...p}><path d="M4 21V5l8-2v18M12 8l8 2v11M3 21h18M8 8v.01M8 12v.01M8 16v.01M16 13v.01M16 17v.01" /></Svg>
)
export const IconUsers: Icon = (p) => (
  <Svg {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" /><path d="M16 4.5a3.5 3.5 0 010 7M18.5 14.8c1.6.8 2.6 2.6 3 5.2" /></Svg>
)
export const IconGift: Icon = (p) => (
  <Svg {...p}><rect x="3" y="8" width="18" height="5" rx="1" /><path d="M5 13v8h14v-8M12 8v13" /><path d="M12 8c-2-4-6-4-6-1.5S9 8 12 8zm0 0c2-4 6-4 6-1.5S15 8 12 8z" /></Svg>
)
export const IconList: Icon = (p) => (
  <Svg {...p}><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></Svg>
)
export const IconLogout: Icon = (p) => (
  <Svg {...p}><path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3" /><path d="M10 16l-4-4 4-4M6 12h10" /></Svg>
)
export const IconCheck: Icon = (p) => <Svg {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>
export const IconAlert: Icon = (p) => (
  <Svg {...p}><path d="M12 3l9.5 17h-19z" /><path d="M12 10v4M12 17.5v.01" /></Svg>
)
export const IconPin: Icon = (p) => (
  <Svg {...p}><path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></Svg>
)
export const IconSort: Icon = (p) => <Svg {...p}><path d="M8 9l4-4 4 4M8 15l4 4 4-4" /></Svg>
export const IconArrowUp: Icon = (p) => <Svg {...p}><path d="M12 19V5M6 11l6-6 6 6" /></Svg>
export const IconArrowDown: Icon = (p) => <Svg {...p}><path d="M12 5v14M6 13l6 6 6-6" /></Svg>
export const IconExternal: Icon = (p) => (
  <Svg {...p}><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" /></Svg>
)
export const IconDownload: Icon = (p) => <Svg {...p}><path d="M12 4v11M7 10l5 5 5-5M4 20h16" /></Svg>
export const IconMenu: Icon = (p) => <Svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Svg>
export const IconSearch: Icon = (p) => <Svg {...p}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.3-4.3" /></Svg>
