/** Admin: list, read, edit and delete charities. */
import type { CharityStatus } from '../../../shared/src/contracts'
import { validateProfile } from '../../../shared/src/validate'
import { publishSnapshot, removeMedia } from '../domain/effects'
import { loadDetail, toSummary } from '../domain/views'
import { requireSession } from '../http/auth'
import { ok, type Handler } from '../http/context'
import { validationError } from '../http/errors'
import { accountOf, adminCharity } from './admin-common'

const STATUSES: readonly CharityStatus[] = ['pending', 'approved', 'rejected', 'suspended']
const isStatus = (v: string): v is CharityStatus => (STATUSES as readonly string[]).includes(v)

export const listAdminCharities: Handler = async (ctx) => {
  await requireSession(ctx, 'admin')
  const raw = ctx.req.query.status
  if (raw !== undefined && raw !== '' && !isStatus(raw)) throw validationError({ status: 'invalid' })
  const status = raw && isStatus(raw) ? raw : undefined
  const { repo } = ctx.deps
  const [charities, updateIds] = await Promise.all([repo.listCharities(status), repo.listUpdateIds()])
  const withUpdate = new Set(updateIds)
  const accounts = await Promise.all(charities.map((c) => accountOf(ctx.deps, c)))
  return ok(charities.map((c, i) => toSummary(c, accounts[i], withUpdate.has(c.id))))
}

export const getAdminCharity: Handler = async (ctx) => {
  const c = await adminCharity(ctx)
  return ok(await loadDetail(ctx.deps.repo, c))
}

/** Admin edits publish at once (the snapshot is rebuilt); media no longer used is removed. */
export const putAdminProfile: Handler = async (ctx) => {
  const c = await adminCharity(ctx)
  const result = validateProfile(ctx.json())
  if (!result.ok) throw validationError(result.fields)
  const { repo } = ctx.deps
  const updated = { ...c, profile: result.value, updatedAt: ctx.deps.now().toISOString() }
  await repo.saveCharity(updated)
  ctx.log.info('admin edit', { charityId: c.id })
  const pending = await repo.getUpdate(c.id)
  await removeMedia(ctx.deps, ctx.log, [c.profile], [updated.profile, pending?.profile])
  await publishSnapshot(ctx.deps, ctx.log)
  return ok(await loadDetail(repo, updated))
}

/**
 * Removes the charity, everything under it, its slug and account. Media goes
 * last, as a logged best-effort step, so a failed delete never leaves a live
 * charity with its images already gone.
 */
export const deleteAdminCharity: Handler = async (ctx) => {
  const c = await adminCharity(ctx)
  const { repo } = ctx.deps
  const pending = await repo.getUpdate(c.id)
  await repo.deleteCharity(c.id)
  await repo.releaseSlug(c.slug)
  const account = await accountOf(ctx.deps, c)
  if (account && account.role === 'charity' && account.charityId === c.id) await repo.deleteAccount(account.email)
  ctx.log.info('charity deleted', { charityId: c.id })
  await removeMedia(ctx.deps, ctx.log, [c.profile, pending?.profile])
  await publishSnapshot(ctx.deps, ctx.log)
  return ok({})
}
