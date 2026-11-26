/** Public endpoints of the charity page: stats, views, pledges, subscriptions. */
import { needKey, needLabel } from '../../../shared/src/catalog'
import type { CharityProfile } from '../../../shared/src/contracts'
import { validatePledge, validateSubscribe } from '../../../shared/src/validate'
import { enforceRateLimit, sendMail } from '../domain/effects'
import { loadStats } from '../domain/views'
import { linksOf } from '../deps'
import { objectBody, ok, param, type Ctx, type Handler } from '../http/context'
import { ApiError, notFound, validationError } from '../http/errors'
import { maskEmail } from '../log'
import { pledgeThankYouEmail } from '../mail/templates'
import type { CharityRecord } from '../repo/types'

const isHoneypot = (body: Readonly<Record<string, unknown>>): boolean =>
  typeof body.website === 'string' && body.website !== ''

export const approvedCharity = async (ctx: Ctx, id: string): Promise<CharityRecord> => {
  const c = await ctx.deps.repo.getCharity(id)
  if (!c || c.status !== 'approved') throw notFound()
  return c
}

export const getStats: Handler = async (ctx) => {
  const c = await approvedCharity(ctx, param(ctx, 'id'))
  return ok(await loadStats(ctx.deps.repo, c))
}

export const postView: Handler = async (ctx) => {
  const c = await approvedCharity(ctx, param(ctx, 'id'))
  await ctx.deps.repo.incrementViews(c.id)
  return ok({})
}

/** Labels for the thank-you mail, in the order the visitor ticked them. */
export const pledgedLabels = (profile: CharityProfile, keys: readonly string[]): string[] => {
  const byKey = new Map(profile.needs.map((n, i) => [needKey(n, i), needLabel(profile.category, n)]))
  return keys.map((k) => byKey.get(k) ?? k)
}

export const postPledge: Handler = async (ctx) => {
  await enforceRateLimit(ctx, 'pledges')
  const body = objectBody(ctx)
  const c = await approvedCharity(ctx, param(ctx, 'id'))
  if (isHoneypot(body)) {
    ctx.log.warn('honeypot filled', { route: 'pledge' })
    return ok({ id: ctx.deps.uuid() })
  }
  const allowed = c.profile.needs.map((n, i) => needKey(n, i))
  const result = validatePledge(body, allowed)
  if (!result.ok) throw validationError(result.fields)
  const v = result.value
  const now = ctx.deps.now().toISOString()
  const id = ctx.deps.uuid()
  await ctx.deps.repo.recordPledge({
    id,
    charityId: c.id,
    needs: v.needs,
    anonymous: v.anonymous,
    ...(v.anonymous || !v.name ? {} : { name: v.name }),
    ...(v.anonymous || !v.name || !v.company ? {} : { company: v.company }),
    ...(v.email ? { email: v.email } : {}),
    ...(v.message ? { message: v.message } : {}),
    createdAt: now,
  })
  if ((v.subscribe || v.general === true) && v.email) {
    await ctx.deps.repo.upsertSubscriber({
      email: v.email,
      ...(v.name ? { name: v.name } : {}),
      ...(v.subscribe ? { charityId: c.id } : {}),
      general: v.general === true,
      consentAt: now,
      source: 'pledge',
    })
  }
  if (v.email) {
    const labels = pledgedLabels(c.profile, v.needs)
    const message = pledgeThankYouEmail(linksOf(ctx.deps.config), c.profile.organization.name, c.slug, labels, v.name)
    await sendMail(ctx.deps, ctx.log, v.email, message)
  }
  ctx.log.info('pledge recorded', { charityId: c.id, needs: v.needs.length })
  return ok({ id })
}

export const postSubscribe: Handler = async (ctx) => {
  await enforceRateLimit(ctx, 'subscribe')
  const body = objectBody(ctx)
  if (isHoneypot(body)) {
    ctx.log.warn('honeypot filled', { route: 'subscribe' })
    return ok({})
  }
  const result = validateSubscribe(body)
  if (!result.ok) throw validationError(result.fields)
  const v = result.value
  if (v.charityId) {
    const c = await ctx.deps.repo.getCharity(v.charityId)
    if (!c || c.status !== 'approved') throw new ApiError('validation', { charityId: 'invalid' })
  }
  await ctx.deps.repo.upsertSubscriber({
    email: v.email,
    ...(v.name ? { name: v.name } : {}),
    ...(v.charityId ? { charityId: v.charityId } : {}),
    general: v.general === true || !v.charityId,
    consentAt: ctx.deps.now().toISOString(),
    source: 'subscribe',
  })
  ctx.log.info('subscribed', { email: maskEmail(v.email) })
  return ok({})
}
