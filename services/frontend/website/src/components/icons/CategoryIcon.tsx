import type { SVGProps } from 'react'

import type { CategoryIcon as CategoryIconName } from '@shared/catalog'
import { cn } from '@/lib/cn'
import { CATEGORY_ICON_PATHS } from './category-icon-paths'

/** A category's icon. Decorative: the category's name is always written beside it. */
export const CategoryIcon = ({
  icon,
  className,
  ...rest
}: { icon: CategoryIconName; className?: string } & Omit<SVGProps<SVGSVGElement>, 'className'>) => (
  <svg
    viewBox="0 0 24 24"
    className={cn('h-[1.25em] w-[1.25em] shrink-0', className)}
    aria-hidden="true"
    focusable="false"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    data-icon={icon}
    {...rest}
  >
    <path d={CATEGORY_ICON_PATHS[icon]} />
  </svg>
)
