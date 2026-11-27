/**
 * Side effects that must never lose the database change before them: mail,
 * the snapshot, media cleanup. Each logs its own failure and reports it as a
 * boolean, so the caller decides what the response says.
 */
import type { CharityProfile } from '../../../shared/src/contracts'
import type { Deps } from '../deps'
import { ApiError } from '../http/errors'
import type { Ctx } from '../http/context'
import type { CharityRecord } from '../repo/types'
import { errorFields, maskEmail, type Logger } from '../log'
import type { Message } from '../mail/render'
import { render } from '../mail/render'
import { CACHE_SNAPSHOT, SNAPSHOT_OBJECT_KEY, mediaObjectKey } from '../storage/types'
import { hashIp } from '../auth/tokens'
import { checkRateLimit, type RateScope } from './ratelimit'
import { buildSnapshot } from './snapshot'

/** False without trying when there is no recipient: an imported charity has no account email. */
export const sendMail = async (deps: Deps, log: Logger, to: string, message: Message): Promise<boolean> => {
  if (to.trim() === '') {
    log.info('mail skipped: no recipient', { subject: message.subject })
    return false
  }
  try {
    await deps.mailer.send(render(to, message))
    log.info('mail sent', { to: maskEmail(to), subject: message.subject })
    return true
  } catch (err) {
    log.error('mail failed', { to: maskEmail(to), subject: message.subject, ...errorFields(err) })
    return false
  }
}

export const notifyAdmin = async (deps: Deps, log: Logger, message: Message): Promise<void> => {
  const to = deps.secrets.adminNotifyEmail
  if (to) await sendMail(deps, log, to, message)
}

/** What the caller has just written, which the status index may not show yet. */
export interface FreshWrites {
  readonly written?: readonly CharityRecord[]
  readonly deleted?: readonly string[]
}

/**
 * The approved set with the caller's own writes laid over it by id: the
 * status index is eventually consistent, so a query straight after a write
 * can still return the record as it was, or miss it.
 */
export const overlayFresh = (approved: readonly CharityRecord[], fresh: FreshWrites): CharityRecord[] => {
  const byId = new Map(approved.map((c) => [c.id, c]))
  for (const id of fresh.deleted ?? []) byId.delete(id)
  for (const c of fresh.written ?? []) {
    if (c.status === 'approved') byId.set(c.id, c)
    else byId.delete(c.id)
  }
  return [...byId.values()]
}

export const publishSnapshot = async (deps: Deps, log: Logger, fresh: FreshWrites = {}): Promise<boolean> => {
  try {
    const approved = overlayFresh(await deps.repo.listCharities('approved'), fresh)
    const snapshot = buildSnapshot(approved, deps.now())
    await deps.storage.put(SNAPSHOT_OBJECT_KEY, {
      body: new TextEncoder().encode(JSON.stringify(snapshot)),
      contentType: 'application/json; charset=utf-8',
      cacheControl: CACHE_SNAPSHOT,
    })
    log.info('snapshot written', { charities: snapshot.charities.length })
    return true
  } catch (err) {
    log.error('snapshot failed', errorFields(err))
    return false
  }
}

export const mediaKeysOf = (profile: CharityProfile | undefined): string[] =>
  profile
    ? [
        ...profile.photos,
        ...(profile.logo ? [profile.logo] : []),
        ...profile.sponsors.flatMap((s) => (s.logo ? [s.logo] : [])),
      ]
    : []

/** Every media key that a stored charity or pending update still references. */
const referencedKeys = async (deps: Deps): Promise<Set<string>> => {
  const { repo } = deps
  const [charities, updateIds] = await Promise.all([repo.listCharities(), repo.listUpdateIds()])
  const updates = await Promise.all(updateIds.map((id) => repo.getUpdate(id)))
  return new Set([...charities.map((c) => c.profile), ...updates.map((u) => u?.profile)].flatMap(mediaKeysOf))
}

/**
 * Best effort: deletes media in `remove` that nothing references any more.
 * Call it only after the database change it follows has been written. A key
 * is kept when `keep` lists it (covers an index that has not caught up yet)
 * or when any stored charity or pending update still uses it, so a profile
 * that names another charity's public key can never get that file deleted.
 * If the references cannot be read, nothing is deleted.
 */
export const removeMedia = async (
  deps: Deps,
  log: Logger,
  remove: readonly (CharityProfile | undefined)[],
  keep: readonly (CharityProfile | undefined)[] = [],
): Promise<void> => {
  const kept = new Set(keep.flatMap(mediaKeysOf))
  const candidates = [...new Set(remove.flatMap(mediaKeysOf))].filter((k) => !kept.has(k))
  if (candidates.length === 0) return
  try {
    const referenced = await referencedKeys(deps)
    const keys = candidates.filter((k) => !referenced.has(k))
    if (candidates.length > keys.length) log.info('media still referenced', { count: candidates.length - keys.length })
    if (keys.length === 0) return
    await deps.storage.remove(keys.map(mediaObjectKey))
    log.info('media removed', { count: keys.length })
  } catch (err) {
    log.error('media removal failed', { count: candidates.length, ...errorFields(err) })
  }
}

export const enforceRateLimit = async (ctx: Ctx, scope: RateScope): Promise<void> => {
  const ipHash = hashIp(ctx.req.ip, ctx.deps.secrets.sessionSecret)
  const allowed = await checkRateLimit(ctx.deps.repo, scope, ipHash, ctx.deps.now())
  if (!allowed) {
    ctx.log.warn('rate limited', { scope })
    throw new ApiError('rate_limited')
  }
}
