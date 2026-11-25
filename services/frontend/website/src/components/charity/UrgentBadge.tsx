import { cn } from '@/lib/cn'

/** "Urgent", as words and a mark: colour is never the only signal. */
export const UrgentBadge = ({ label, className }: { label: string; className?: string }) => (
  <span
    className={cn(
      'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5',
      'border border-(--color-danger-500)/40 bg-(--color-danger-500)/10',
      'text-(length:--text-xs) font-semibold text-(--text-primary)',
      className,
    )}
  >
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-(--color-danger-600)" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M12 2.5l10 18H2l10-18Zm-1 7v5h2v-5h-2Zm0 6.5v2h2v-2h-2Z" />
    </svg>
    {label}
  </span>
)
