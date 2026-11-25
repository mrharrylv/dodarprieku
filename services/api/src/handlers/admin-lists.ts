/** Admin: subscribers, pledges and subscriber-list requests. */
import { requireSession } from '../http/auth'
import { ok, param, type Handler } from '../http/context'
import { notFound } from '../http/errors'

export const listSubscribers: Handler = async (ctx) => {
  await requireSession(ctx, 'admin')
  return ok(await ctx.deps.repo.listSubscribers())
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
