import { categoryById, type CategoryId } from '@shared/catalog'
import { cn } from '@/lib/cn'
import { CategoryIcon } from './CategoryIcon'
import { toneVar } from './category-tone'
import './category-tones.css'

const SIZES = { sm: 'h-8 w-8 text-(length:--text-sm)', md: 'h-10 w-10 text-(length:--text-base)', lg: 'h-12 w-12 text-(length:--text-lg)' }

/** A category's icon in its round coloured badge. Decorative; the label is beside it. */
export const CategoryBadge = ({
  category,
  size = 'md',
  surface = 'ui',
  className,
}: {
  category: CategoryId
  size?: keyof typeof SIZES
  surface?: 'ui' | 'pin'
  className?: string
}) => (
  <span
    aria-hidden="true"
    className={cn('inline-flex shrink-0 items-center justify-center rounded-full', SIZES[size], className)}
    style={{ backgroundColor: toneVar(category, surface), color: surface === 'pin' ? 'var(--pin-on)' : 'var(--cat-on)' }}
  >
    <CategoryIcon icon={categoryById(category).icon} />
  </span>
)

/** The category's name beside its badge, as a soft pill. */
export const CategoryLabel = ({ category, className }: { category: CategoryId; className?: string }) => (
  <span
    className={cn(
      'inline-flex items-center gap-2 rounded-full border border-(--border-subtle) bg-(--surface-sunken) py-1 pr-3 pl-1',
      'text-(length:--text-sm) font-medium text-(--text-primary)',
      className,
    )}
  >
    <CategoryBadge category={category} size="sm" />
    {categoryById(category).label}
  </span>
)
