/** The charity's own account: dashboard, profile update request, pledges, list request. */
import { LIMITS } from '../../../shared/src/contracts'
import { validateProfile } from '../../../shared/src/validate'
import { notifyAdmin } from '../domain/effects'
import { loadAccountView, withoutEmail } from '../domain/views'
import { linksOf } from '../deps'
import { requireCharity } from '../http/auth'
import { objectBody, ok, type Ctx, type Handler } from '../http/context'
import { notFound, validationError } from '../http/errors'
import { adminNewUpdateEmail } from '../mail/templates'
import type { CharityRecord } from '../repo/types'

const ownCharity = async (ctx: Ctx): Promise<CharityRecord> => {
  const { charityId } = await requireCharity(ctx)
  const c = await ctx.deps.repo.getCharity(charityId)
  if (!c) throw notFound()
  return c
}

export const getAccount: Handler = async (ctx) => {
  const c = await ownCharity(ctx)
  return ok(await loadAccountView(ctx.deps.repo, c))
}

/** Saving never changes the live profile: it becomes a pending update for the admin. */
export const putAccountProfile: Handler = async (ctx) => {
  const c = await ownCharity(ctx)
  const result = validateProfile(ctx.json())
  if (!result.ok) throw validationError(result.fields)
  await ctx.deps.repo.putUpdate({
    charityId: c.id,
    profile: result.value,
    submittedAt: ctx.deps.now().toISOString(),
  })
  ctx.log.info('update submitted', { charityId: c.id })
  await notifyAdmin(ctx.deps, ctx.log, adminNewUpdateEmail(linksOf(ctx.deps.config), c.id, c.profile.organization.name))
  return ok(await loadAccountView(ctx.deps.repo, c))
}

export const getAccountPledges: Handler = async (ctx) => {
  const c = await ownCharity(ctx)
  const pledges = await ctx.deps.repo.listPledges(c.id)
  return ok(pledges.map(withoutEmail))
}

export const postListRequest: Handler = async (ctx) => {
  const c = await ownCharity(ctx)
  const body = objectBody(ctx)
  const raw = body.message
  if (raw !== undefined && raw !== null && typeof raw !== 'string') throw validationError({ message: 'invalid' })
  const message = typeof raw === 'string' ? raw.trim() : ''
  if (message.length > LIMITS.pledgeMessage) throw validationError({ message: 'too_long' })
  const record = {
    id: ctx.deps.uuid(),
    charityId: c.id,
    charityName: c.profile.organization.name,
    ...(message ? { message } : {}),
    status: 'open' as const,
    createdAt: ctx.deps.now().toISOString(),
  }
  await ctx.deps.repo.putListRequest(record)
  ctx.log.info('list request', { charityId: c.id })
  return ok(record)
}
