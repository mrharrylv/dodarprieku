import { describe, expect, it } from 'vitest'
import type { ListRequestRecord, PledgeRecord } from '@shared/contracts'
import { summary } from '../test/fixtures'
import { charityCounts, newestFirst, pledgesSince } from './dashboard'

const req = (status: 'open' | 'done'): ListRequestRecord => ({
  id: status, charityId: 'c1', charityName: 'U', status, createdAt: '2026-11-01',
})
const pledge = (createdAt: string): PledgeRecord => ({ id: createdAt, charityId: 'c1', needs: ['x'], anonymous: true, createdAt })

describe('charityCounts', () => {
  it('counts each status, pending updates and open requests', () => {
    const counts = charityCounts(
      [
        summary({ status: 'pending' }), summary({ status: 'pending' }), summary({ status: 'approved', hasPendingUpdate: true }),
        summary({ status: 'suspended' }), summary({ status: 'rejected' }),
      ],
      [req('open'), req('done'), req('open')],
    )
    expect(counts).toEqual({ pendingApplications: 2, pendingUpdates: 1, approved: 1, suspended: 1, openRequests: 2 })
  })
})

describe('pledgesSince', () => {
  it('counts pledges inside the window and ignores future and broken dates', () => {
    const now = new Date('2026-11-25T12:00:00Z')
    const list = [
      pledge('2026-11-25T11:00:00Z'), pledge('2026-10-27T12:00:00Z'), pledge('2026-10-26T11:59:59Z'),
      pledge('2026-12-01T00:00:00Z'), pledge('nonsense'),
    ]
    expect(pledgesSince(list, now, 30)).toBe(2)
  })
})

describe('newestFirst', () => {
  it('sorts a copy by the timestamp, newest first', () => {
    const rows = Object.freeze([{ at: '2026-01-01' }, { at: '2026-03-01' }, { at: '2026-02-01' }])
    expect(newestFirst(rows, (r) => r.at).map((r) => r.at)).toEqual(['2026-03-01', '2026-02-01', '2026-01-01'])
  })
})
