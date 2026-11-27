/**
 * Approving a claim: an application (claimCharityId set) that asks to take
 * over a charity imported from a public register. The submitted profile and
 * the account are merged into the imported charity, which keeps its id, slug,
 * views and pledges; the claim record itself goes, and every other pending
 * claim for the same charity is turned down.
 */
import { publishSnapshot, removeMedia, sendMail } from '../domain/effects'
import { isClaimable } from '../domain/snapshot'
import { loadDetail } from '../domain/views'
import { linksOf } from '../deps'
import { ok, type Ctx, type HandlerResult } from '../http/context'
import { conflict } from '../http/errors'
import { applicationRejectedEmail } from '../mail/templates'
import type { CharityRecord } from '../repo/types'
import { sendCharityInvite } from './admin-common'

/** The reason the other claimants are given. Latvian: it is mailed as is. */
export const CLAIM_TAKEN_REASON = 'Šo profilu pieprasīja arī kāds cits, un apstiprinājām viņa pieteikumu.'

type Dropped = 'source' | 'demoNeeds' | 'rejectReason' | 'suspendReason' | 'claimCharityId'

const without = (c: CharityRecord, fields: readonly Dropped[]): CharityRecord =>
  Object.fromEntries(Object.entries(c).filter(([k]) => !(fields as readonly string[]).includes(k))) as unknown as CharityRecord

/** The imported charity with the claimant's profile and account in it. */
export const mergeClaim = (target: CharityRecord, claim: CharityRecord, now: string): CharityRecord => ({
  ...without(target, ['source', 'demoNeeds', 'claimCharityId']),
  profile: claim.profile,
  accountEmail: claim.accountEmail,
  claimedAt: now,
  updatedAt: now,
})

const rejectOtherClaims = async (ctx: Ctx, targetId: string, approvedId: string, now: string): Promise<number> => {
  const { repo } = ctx.deps
  const others = (await repo.listCharities('pending')).filter((c) => c.claimCharityId === targetId && c.id !== approvedId)
  for (const other of others) {
    await repo.saveCharity({ ...without(other, ['rejectReason']), status: 'rejected', rejectReason: CLAIM_TAKEN_REASON, updatedAt: now })
    const message = applicationRejectedEmail(linksOf(ctx.deps.config), other.profile.organization.name, CLAIM_TAKEN_REASON)
    await sendMail(ctx.deps, ctx.log, other.accountEmail, message)
  }
  return others.length
}

/**
 * True when an earlier approval of this very claim already wrote the merge and
 * then failed: the target carries the claimant's email and its claim date.
 */
const mergedBy = (target: CharityRecord, claim: CharityRecord): boolean =>
  !isClaimable(target) && target.claimedAt !== undefined && target.accountEmail === claim.accountEmail

/**
 * The merge is written first, conditionally (it fails if another claim won the
 * race), and the account last; a retry after a partial failure finds its own
 * merge and finishes the remaining steps instead of answering 409.
 */
export const approveClaim = async (ctx: Ctx, claim: CharityRecord, targetId: string): Promise<HandlerResult> => {
  const { repo } = ctx.deps
  const target = await repo.getCharity(targetId)
  if (!target) throw conflict()
  const resumed = mergedBy(target, claim)
  // Not into a suspended charity: it is off the map, and the invite says it is on it.
  if (!resumed && (!isClaimable(target) || target.status !== 'approved')) throw conflict()
  const account = await repo.getAccount(claim.accountEmail)
  if (account && (account.role !== 'charity' || account.charityId !== target.id)) throw conflict()
  const now = ctx.deps.now().toISOString()
  const merged = resumed ? target : mergeClaim(target, claim, now)
  if (!resumed && !(await repo.saveClaimMerge(merged))) throw conflict()
  if (!account) {
    await repo.putAccount({
      email: claim.accountEmail, role: 'charity', charityId: target.id, sessionVersion: 0, createdAt: now, updatedAt: now,
    })
  }
  // A claim never holds a slug of its own (it carries the target's), so none is released.
  await repo.deleteCharity(claim.id)
  const rejected = await rejectOtherClaims(ctx, target.id, claim.id, now)
  ctx.log.info('claim approved', { charityId: target.id, claimId: claim.id, otherClaimsRejected: rejected, resumed })
  if (!resumed) await removeMedia(ctx.deps, ctx.log, [target.profile], [merged.profile])
  const snapshotWritten = await publishSnapshot(ctx.deps, ctx.log, { written: [merged], deleted: [claim.id] })
  const mailSent = await sendCharityInvite(ctx.deps, ctx.log, merged)
  return ok({ ...(await loadDetail(repo, merged)), mailSent, snapshotWritten })
}
