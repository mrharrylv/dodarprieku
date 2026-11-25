/** The dashboard and sidebar counts, computed from the admin lists. Pure. */
import type { AdminCharitySummary, ListRequestRecord, PledgeRecord } from '@shared/contracts'

export interface Counts {
  readonly pendingApplications: number
  readonly pendingUpdates: number
  readonly approved: number
  readonly suspended: number
  readonly openRequests: number
}

export const DAY_MS = 86_400_000

export const charityCounts = (
  charities: readonly AdminCharitySummary[],
  requests: readonly ListRequestRecord[],
): Counts => ({
  pendingApplications: charities.filter((c) => c.status === 'pending').length,
  pendingUpdates: charities.filter((c) => c.hasPendingUpdate).length,
  approved: charities.filter((c) => c.status === 'approved').length,
  suspended: charities.filter((c) => c.status === 'suspended').length,
  openRequests: requests.filter((r) => r.status === 'open').length,
})

export const pledgesSince = (pledges: readonly PledgeRecord[], now: Date, days: number): number => {
  const from = now.getTime() - days * DAY_MS
  return pledges.filter((p) => {
    const t = Date.parse(p.createdAt)
    return Number.isFinite(t) && t >= from && t <= now.getTime()
  }).length
}

/** Newest first by an ISO timestamp field, without touching the input. */
export const newestFirst = <T>(rows: readonly T[], at: (row: T) => string): readonly T[] =>
  rows.slice().sort((a, b) => at(b).localeCompare(at(a)))
