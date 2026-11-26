/** Admin: subscribers, pledges and subscriber-list requests. */
import { SUBSCRIBER_SCOPES, type SubscriberScope } from '../../../shared/src/contracts'
import { requireSession } from '../http/auth'
import { ok, param, type Handler } from '../http/context'
import { ApiError, notFound } from '../http/errors'

const isScope = (value: string): value is SubscriberScope => (SUBSCRIBER_SCOPES as readonly string[]).includes(value)

/** `?scope=general` lists the general newsletter's subscribers; `all` (the default) everyone. */
export const listSubscribers: Handler = async (ctx) => {
  await requireSession(ctx, 'admin')
  const scope = ctx.req.query.scope ?? 'all'
  if (!isScope(scope)) throw new ApiError('validation', { scope: 'invalid' })
  const all = await ctx.deps.repo.listSubscribers()
  return ok(scope === 'general' ? all.filter((s) => s.general) : all)
}

/** One organisation's subscribers, for its detail page and its CSV. */
export const listCharitySubscribers: Handler = async (ctx) => {
  await requireSession(ctx, 'admin')
  const id = param(ctx, 'id')
  if (!(await ctx.deps.repo.getCharity(id))) throw notFound()
  const all = await ctx.deps.repo.listSubscribers()
  return ok(all.filter((s) => s.charityIds.includes(id)))
}

export const listAdminPledges: Handler = async (ctx) => {
  await requireSession(ctx, 'admin')
  const charityId = ctx.req.query.charityId
  return ok(await ctx.deps.repo.listPledges(charityId === undefined || charityId === '' ? undefined : charityId))
}

export const listListRequests: Handler = async (ctx) => {
  await requireSession(ctx, 'admin')
  return ok(await ctx.deps.repo.listListRequests())
}

export const markListRequestDone: Handler = async (ctx) => {
  await requireSession(ctx, 'admin')
  const { repo } = ctx.deps
  const found = await repo.getListRequest(param(ctx, 'charityId'), param(ctx, 'id'))
  if (!found) throw notFound()
  const done = { ...found, status: 'done' as const }
  await repo.putListRequest(done)
  ctx.log.info('list request done', { charityId: found.charityId })
  return ok(done)
}
