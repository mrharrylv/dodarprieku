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
  claimTarget?: CharityRecord,
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
  ...(claimTarget
    ? { claim: { charityId: claimTarget.id, name: claimTarget.profile.organization.name, slug: claimTarget.slug } }
    : {}),
})

/** The imported charity a claim application asks for, when it still exists. */
export const claimTargetOf = (repo: Repository, c: CharityRecord): Promise<CharityRecord | undefined> =>
  c.claimCharityId === undefined ? Promise.resolve(undefined) : repo.getCharity(c.claimCharityId)

export const toDetail = (
  c: CharityRecord,
  account: AccountRecord | undefined,
  update: UpdateRecord | undefined,
  claimTarget?: CharityRecord,
): AdminCharityDetail => {
  const pendingUpdate = pendingOf(update)
  return {
    ...toSummary(c, account, update !== undefined, claimTarget),
    profile: c.profile,
    ...(claimTarget ? { claimProfile: claimTarget.profile } : {}),
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
    .map((p) => ({ name: p.name as string, ...(p.company ? { company: p.company } : {}), at: p.createdAt })),
})

export const loadStats = async (repo: Repository, c: CharityRecord): Promise<CharityStats> => {
  const [pledges, byNeed] = await Promise.all([repo.listPledges(c.id), repo.getNeedCounts(c.id)])
  return statsOf(c, pledges, byNeed)
}

export const loadDetail = async (repo: Repository, c: CharityRecord): Promise<AdminCharityDetail> => {
  const [account, update, claimTarget] = await Promise.all([
    c.accountEmail === '' ? undefined : repo.getAccount(c.accountEmail),
    repo.getUpdate(c.id),
    claimTargetOf(repo, c),
  ])
  return toDetail(c, account, update, claimTarget)
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
