import { useId, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

/** A soft rounded card with its own h2: every section of the charity page. */
export const SectionCard = ({
  title,
  children,
  className,
  action,
}: {
  title: string
  children: ReactNode
  className?: string
  action?: ReactNode
}) => {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className={cn('rounded-(--radius-2xl) border border-(--border-subtle) bg-(--surface-raised) p-5 shadow-(--shadow-subtle) sm:p-7', className)}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={id} className="text-(length:--text-xl) font-semibold text-(--text-primary)">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}
