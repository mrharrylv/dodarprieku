import { Link } from 'react-router-dom'
import { Loaded } from '../components/Loaded'
import { PageHeader } from '../components/ui'
import { useApi } from '../context/api'
import { useResource } from '../hooks/useResource'
import { lv } from '../i18n/lv'
import { charityCounts, pledgesSince } from '../lib/dashboard'
import { formatNumber } from '../lib/format'
import { PATHS } from '../paths'

const PLEDGE_WINDOW_DAYS = 30

interface Tile {
  readonly label: string
  readonly value: number
  readonly to: string
  readonly highlight?: boolean
}

export const DashboardPage = () => {
  const api = useApi()
  const { resource, reload } = useResource(
    () => Promise.all([api.charities(), api.subscribers(), api.pledges(), api.listRequests()]),
    'dashboard',
  )

  return (
    <>
      <PageHeader title={lv.dashboard.title} />
      <Loaded resource={resource} onRetry={reload} rows={3}>
        {([charities, subscribers, pledges, requests]) => {
          const c = charityCounts(charities, requests)
          const tiles: readonly Tile[] = [
            { label: lv.dashboard.pendingApplications, value: c.pendingApplications, to: PATHS.applications, highlight: c.pendingApplications > 0 },
            { label: lv.dashboard.pendingUpdates, value: c.pendingUpdates, to: PATHS.updates, highlight: c.pendingUpdates > 0 },
            { label: lv.dashboard.approved, value: c.approved, to: PATHS.charities },
            { label: lv.dashboard.suspended, value: c.suspended, to: PATHS.charities },
            { label: lv.dashboard.subscribers, value: subscribers.length, to: PATHS.subscribers },
            { label: lv.dashboard.pledges30, value: pledgesSince(pledges, new Date(), PLEDGE_WINDOW_DAYS), to: PATHS.pledges },
            { label: lv.dashboard.openRequests, value: c.openRequests, to: PATHS.listRequests, highlight: c.openRequests > 0 },
          ]
          return (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tiles.map((t) => (
                <li key={t.label}>
                  <Link
                    to={t.to}
                    className={`block rounded-[var(--radius-lg)] border p-5 shadow-[var(--shadow-subtle)] hover:shadow-[var(--shadow-card)] ${
                      t.highlight
                        ? 'border-[var(--border-accent-soft)] bg-[var(--surface-accent-soft)]'
                        : 'border-[var(--border-subtle)] bg-[var(--surface-raised)]'
                    }`}
                  >
                    <span className="block text-sm text-[var(--text-secondary)]">{t.label}</span>
                    <span className="mt-1 block font-[family-name:var(--font-display)] text-[length:var(--text-3xl)] font-semibold">
                      {formatNumber(t.value)}
                    </span>
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
