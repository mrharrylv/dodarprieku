import { Link } from 'react-router-dom'

import { Icon } from '@/components/ui/Icon'

/**
 * The one link style that is not body text: small, tracked, underlined on
 * hover only. It is a flex row with min-h-11 so the tap target clears 44px
 * even though the type is small.
 */
export const MoreLink = ({ to, children }: { to: string; children: string }) => (
  <Link
    to={to}
    className="inline-flex min-h-11 items-center gap-2 text-(length:--text-sm) uppercase tracking-[0.16em] text-(--text-accent) underline-offset-8 hover:underline"
  >
    {children}
    <Icon name="arrowRight" className="h-4 w-4" />
  </Link>
)
