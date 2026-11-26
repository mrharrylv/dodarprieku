import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { CategoryId } from '@shared/catalog'
import { cn } from '@/lib/cn'
import { Icon, type IconName } from '@/components/ui/Icon'
import { CategoryBadge } from '@/components/icons/CategoryBadge'

/**
 * A round button of the card: a 32px glass circle, smaller than the map's
 * controls so it does not crowd the cover, inside a 44px hit area.
 */
export const CardButton = ({
  icon,
  label,
  onClick,
  focusKey,
  controls,
}: {
  icon: IconName
  label: string
  onClick: () => void
  /** Which `CardFocus` this button answers to. */
  focusKey?: string
  controls?: string
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    {...(focusKey === undefined ? {} : { 'data-focus': focusKey })}
    {...(controls === undefined ? {} : { 'aria-controls': controls })}
    className="group -m-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none"
  >
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-(--surface-raised)/90 text-(length:--text-sm) text-(--text-primary) shadow-(--shadow-card) backdrop-blur-sm transition-colors group-hover:bg-(--surface-raised) group-focus-visible:ring-2 group-focus-visible:ring-(--ring-accent)">
      <Icon name={icon} />
    </span>
  </button>
)

/**
 * The expanded card's header, sticky at the top of its scroll: the collapse
 * and close buttons always, and once the visitor has scrolled past the title
 * (or is on the pledge steps) a compact pill with the category icon and the
 * name, on a glass bar. `back` adds the arrow of the pledge steps.
 */
export const CardHeader = ({
  name,
  category,
  solid,
  back,
  controls,
  onCollapse,
  onClose,
}: {
  name: string
  category: CategoryId
  /** Scrolled past the title, or on a step without a cover: the bar and the pill show. */
  solid: boolean
  back?: { readonly label: string; readonly onClick: () => void } | undefined
  controls: string
  onCollapse: () => void
  onClose: () => void
}) => {
  const { t } = useTranslation('map')
  return (
    <div
      data-card-header=""
      className={cn(
        'sticky top-0 z-20 -mb-14 flex h-14 items-center gap-2 px-3 transition-[background-color,box-shadow] duration-200',
        solid && 'border-b border-(--border-subtle) bg-(--surface-raised)/90 shadow-(--shadow-subtle) backdrop-blur-md',
      )}
    >
      {back !== undefined && <CardButton icon="arrowLeft" label={back.label} onClick={back.onClick} focusKey="back" />}
      <Pill name={name} category={category} shown={solid} />
      <CardButton icon="chevronDown" label={t('popup.collapse')} onClick={onCollapse} focusKey="collapse" controls={controls} />
      <CardButton icon="close" label={t('popup.close')} onClick={onClose} />
    </div>
  )
}

const Pill = ({ name, category, shown }: { name: string; category: CategoryId; shown: boolean }): ReactNode => (
  <p
    aria-hidden={!shown}
    className={cn(
      'mr-auto inline-flex min-w-0 items-center gap-2 rounded-full border border-(--border-subtle) bg-(--surface-sunken) py-1 pr-3 pl-1 text-(length:--text-sm) font-semibold text-(--text-primary) transition-opacity duration-200',
      shown ? 'opacity-100' : 'pointer-events-none opacity-0',
    )}
  >
    <CategoryBadge category={category} size="sm" className="h-6 w-6 text-(length:--text-xs)" />
    <span className="truncate">{name}</span>
  </p>
)
