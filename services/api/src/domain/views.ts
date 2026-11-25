/** Records -> the response shapes of the contracts. Pure. */
import type {
  AccountView,
  AdminCharityDetail,
  AdminCharitySummary,
  CharityStats,
  PendingUpdate,
  PledgeRecord,
} from '../../../shared/src/contracts'
import type { Repository } from '../repo/types'
import type { AccountRecord, CharityRecord, UpdateRecord } from '../repo/types'

export const MAX_RECENT_SUPPORTERS = 20

export const pendingOf = (u: UpdateRecord | undefined): PendingUpdate | undefined =>
  u ? { profile: u.profile, submittedAt: u.submittedAt } : undefined

export const toSummary = (
  c: CharityRecord,
  account: AccountRecord | undefined,
  hasPendingUpdate: boolean,
): AdminCharitySummary => ({
  id: c.id,
  slug: c.slug,
  name: c.profile.organization.name,
  category: c.profile.category,
  city: c.profile.address.city,
  status: c.status,
  hasPendingUpdate,
  accountEmail: c.accountEmail,
  passwordSet: Boolean(account?.passwordHash && account.charityId === c.id),
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
  views: c.views,
  pledges: c.pledges,
})

export const toDetail = (
  c: CharityRecord,
  account: AccountRecord | undefined,
  update: UpdateRecord | undefined,
): AdminCharityDetail => {
  const pendingUpdate = pendingOf(update)
  return {
    ...toSummary(c, account, update !== undefined),
    profile: c.profile,
    ...(pendingUpdate ? { pendingUpdate } : {}),
    ...(c.rejectReason ? { rejectReason: c.rejectReason } : {}),
    ...(c.suspendReason ? { suspendReason: c.suspendReason } : {}),
  }
}

export const withoutEmail = (p: PledgeRecord): PledgeRecord => {
  const { email: _hidden, ...rest } = p
  return rest
}

export const statsOf = (
  c: CharityRecord,
  pledges: readonly PledgeRecord[],
  byNeed: Readonly<Record<string, number>>,
): CharityStats => ({
  views: c.views,
  pledges: c.pledges,
  pledgesByNeed: byNeed,
  recentSupporters: pledges
    .filter((p) => !p.anonymous && p.name)
    .slice(0, MAX_RECENT_SUPPORTERS)
    .map((p) => ({ name: p.name as string, at: p.createdAt })),
})

export const loadStats = async (repo: Repository, c: CharityRecord): Promise<CharityStats> => {
  const [pledges, byNeed] = await Promise.all([repo.listPledges(c.id), repo.getNeedCounts(c.id)])
  return statsOf(c, pledges, byNeed)
}

export const loadDetail = async (repo: Repository, c: CharityRecord): Promise<AdminCharityDetail> => {
  const [account, update] = await Promise.all([
    c.accountEmail === '' ? undefined : repo.getAccount(c.accountEmail),
    repo.getUpdate(c.id),
  ])
  return toDetail(c, account, update)
}

export const loadAccountView = async (repo: Repository, c: CharityRecord): Promise<AccountView> => {
  const [stats, subscribers, update, requests] = await Promise.all([
    loadStats(repo, c),
    repo.countCharitySubscribers(c.id),
    repo.getUpdate(c.id),
    repo.listListRequests(c.id),
  ])
  const pendingUpdate = pendingOf(update)
  const last = requests[0]?.createdAt
  return {
    id: c.id,
    slug: c.slug,
    status: c.status,
    profile: c.profile,
    ...(pendingUpdate ? { pendingUpdate } : {}),
    stats: { ...stats, subscribers },
    ...(last ? { lastListRequestAt: last } : {}),
  }
}
