import { Link } from 'react-router-dom'
import { Loaded } from '../components/Loaded'
import { EmptyState, PageHeader } from '../components/ui'
import { useApi } from '../context/api'
import { useResource } from '../hooks/useResource'
import { lv } from '../i18n/lv'
import { newestFirst } from '../lib/dashboard'
import { categoryLabel, formatDateTime } from '../lib/format'
import { updatePath } from '../paths'

export const UpdatesPage = () => {
  const api = useApi()
  const { resource, reload } = useResource(() => api.charities(), 'updates')
  return (
    <>
      <PageHeader title={lv.updates.title} intro={lv.updates.intro} />
      <Loaded resource={resource} onRetry={reload}>
        {(rows) => {
          const pending = newestFirst(rows.filter((r) => r.hasPendingUpdate), (r) => r.updatedAt)
          if (pending.length === 0) return <EmptyState text={lv.updates.empty} />
          return (
            <ul className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
              {pending.map((c) => (
                <li key={c.id}>
                  <Link to={updatePath(c.id)} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 hover:bg-[var(--surface-sunken)]">
                    <span className="min-w-0 flex-1 font-semibold">{c.name}</span>
                    <span className="text-sm text-[var(--text-secondary)]">{categoryLabel(c.category)} · {c.city}</span>
                    <span className="text-sm text-[var(--text-muted)]">{formatDateTime(c.updatedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )
        }}
      </Loaded>
    </>
  )
}
