import { useTranslation } from 'react-i18next'

import { CATEGORIES, type CategoryId } from '@shared/catalog'

import { CategoryBadge } from '@/components/icons/CategoryBadge'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/cn'

/**
 * The categories as a grid of selectable cards: a radio group, so arrow keys
 * move between them and a screen reader hears "1 of 13, selected".
 */
export const CategoryGrid = ({
  value,
  onSelect,
  name,
  describedBy,
}: {
  value: CategoryId | ''
  onSelect: (id: CategoryId) => void
  name: string
  describedBy?: string | undefined
}) => {
  const { t } = useTranslation('register')
  return (
    <div role="radiogroup" aria-label={t('about.categoryLegend')} aria-describedby={describedBy}
      className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3">
      {CATEGORIES.map((category) => {
        const checked = value === category.id
        return (
          <label
            key={category.id}
            className={cn(
              'group relative flex min-h-16 cursor-pointer items-center gap-3 rounded-(--radius-lg) border-2 p-3',
              'transition-[border-color,background-color,box-shadow,transform] duration-200 ease-(--ease-out-soft)',
              'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-(--ring-accent) has-[:focus-visible]:ring-offset-2',
              checked
                ? 'border-(--fill-accent) bg-(--surface-accent-soft) shadow-(--shadow-card)'
                : 'border-(--border-subtle) bg-(--surface-raised) hover:-translate-y-0.5 hover:border-(--border-strong)',
            )}
          >
            <input
              type="radio"
              name={name}
              value={category.id}
              checked={checked}
              onChange={() => onSelect(category.id)}
              aria-invalid={describedBy !== undefined && value === '' ? true : undefined}
              className="sr-only"
            />
            <CategoryBadge category={category.id} />
            <span className="min-w-0 flex-1 font-medium text-(--text-primary)">{category.label}</span>
            <span
              aria-hidden="true"
              className={cn(
                'grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-all duration-200',
                checked ? 'scale-100 border-(--fill-accent) bg-(--fill-accent) text-(--text-on-accent)' : 'scale-90 border-(--border-strong)',
              )}
            >
              {checked && <Icon name="check" className="h-4 w-4" />}
            </span>
          </label>
        )
      })}
    </div>
  )
}
