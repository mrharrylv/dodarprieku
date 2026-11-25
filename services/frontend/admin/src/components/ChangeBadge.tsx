import type { ChangeStatus } from '../lib/diff'
import { lv } from '../i18n/lv'

export type Status = ChangeStatus | 'moved'

const TONE: Record<Status, string> = {
  added: 'border-[var(--border-success)] bg-[var(--surface-success-soft)] text-[var(--text-success)]',
  removed: 'border-[var(--border-danger)] bg-[var(--surface-danger-soft)] text-[var(--text-danger)]',
  changed: 'border-[var(--border-warning)] bg-[var(--surface-warning-soft)] text-[var(--text-warning)]',
  moved: 'border-[var(--border-accent-soft)] bg-[var(--surface-accent-soft)] text-[var(--text-accent)]',
  unchanged: 'border-[var(--border-subtle)] text-[var(--text-muted)]',
}

export const ChangeBadge = ({ status }: { readonly status: Status }) =>
  status === 'unchanged' ? null : (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${TONE[status]}`}>
      {lv.updates[status]}
    </span>
  )

export const rowTone = (status: Status): string =>
  status === 'unchanged' ? '' : status === 'removed' ? 'bg-[var(--surface-danger-soft)]' : status === 'added' ? 'bg-[var(--surface-success-soft)]' : 'bg-[var(--surface-warning-soft)]'

