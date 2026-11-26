/**
 * Direct invocations (no API Gateway event): only an IAM principal allowed to
 * call lambda:InvokeFunction can reach these.
 *
 *   { "task": "invite-admin", "email": "..." }
 *   { "task": "rebuild-snapshot" }
 *   { "task": "import-charities", "items": [ImportedCharity, ...] }   (no snapshot; rebuild at the end)
 *   { "task": "remove-imported", "source": "import:...", "limit"?: 50 }  (rebuilds once none remain)
 *   { "task": "demo-needs", "source": "import:...", "fraction"?: 0.25, "seed"?: 1 }  (not on prod; rebuilds)
 *   { "task": "clear-demo-needs" }                                                (not on prod; rebuilds)
 */
import { isEmail, normaliseEmail } from '../../shared/src/validate'
import { publishSnapshot, sendMail } from './domain/effects'
import { DEFAULT_DEMO_FRACTION, DEFAULT_DEMO_SEED, applyDemoNeeds, clearDemoNeeds } from './domain/demo-needs'
import { importCharities, removeImported } from './domain/import'
import { IMPORT_SOURCE_RE, isImportedCharity } from './domain/imported'
import { linksOf, type Deps } from './deps'
import { createToken } from './handlers/auth'
import { errorFields, maskEmail } from './log'
import { adminInviteEmail } from './mail/templates'
import type { AccountRecord } from './repo/types'

export type TaskResult =
  | { readonly ok: true; readonly data: Readonly<Record<string, unknown>> }
  | { readonly ok: false; readonly error: string }

const inviteAdmin = async (deps: Deps, rawEmail: unknown): Promise<TaskResult> => {
  const email = normaliseEmail(typeof rawEmail === 'string' ? rawEmail : '')
  if (!isEmail(email)) return { ok: false, error: 'invalid email' }
  const existing = await deps.repo.getAccount(email)
  if (existing && existing.role !== 'admin') return { ok: false, error: 'this email belongs to a charity account' }
  const now = deps.now().toISOString()
  const account: AccountRecord = existing
    ? { ...existing, updatedAt: now }
    : { email, role: 'admin', sessionVersion: 0, createdAt: now, updatedAt: now }
  await deps.repo.putAccount(account)
  const token = await createToken(deps, email, 'set-password')
  const mailSent = await sendMail(deps, deps.log, email, adminInviteEmail(linksOf(deps.config), token))
  deps.log.info('admin invited', { email: maskEmail(email), created: !existing, mailSent })
  return { ok: true, data: { email, created: !existing, mailSent } }
}

/** One invoke payload stays under Lambda's 6 MB and its 10 s timeout. */
export const MAX_IMPORT_ITEMS = 200
const DEFAULT_REMOVE_LIMIT = 50
const MAX_REMOVE_LIMIT = 200

const importTask = async (deps: Deps, items: unknown): Promise<TaskResult> => {
  if (!Array.isArray(items) || items.length === 0) return { ok: false, error: 'items must be a non-empty array' }
  if (items.length > MAX_IMPORT_ITEMS) return { ok: false, error: `at most ${MAX_IMPORT_ITEMS} items per call` }
  const bad = items.findIndex((item: unknown) => !isImportedCharity(item))
  if (bad >= 0) return { ok: false, error: `item ${bad} is not an imported charity` }
  const valid = items.filter(isImportedCharity)
  if (new Set(valid.map((i) => i.id)).size !== valid.length) return { ok: false, error: 'duplicate ids' }
  const result = await importCharities(deps, deps.log, valid)
  return { ok: true, data: { ...result } }
}

const removeTask = async (deps: Deps, source: unknown, rawLimit: unknown): Promise<TaskResult> => {
  if (typeof source !== 'string' || !IMPORT_SOURCE_RE.test(source)) return { ok: false, error: 'source must be import:<dataset>' }
  const limit = rawLimit === undefined ? DEFAULT_REMOVE_LIMIT : rawLimit
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > MAX_REMOVE_LIMIT) {
    return { ok: false, error: `limit must be 1-${MAX_REMOVE_LIMIT}` }
  }
  const result = await removeImported(deps, deps.log, source, limit)
  if (result.snapshotWritten === false) return { ok: false, error: 'snapshot failed' }
  return { ok: true, data: { ...result } }
}

/** Made-up needs never reach production's map. */
export const PROD_ENVIRONMENT = 'prod'
const NOT_ON_PROD: TaskResult = { ok: false, error: 'demo needs are refused on prod' }

const demoNeedsTask = async (deps: Deps, event: Readonly<Record<string, unknown>>): Promise<TaskResult> => {
  if (deps.config.environment === PROD_ENVIRONMENT) return NOT_ON_PROD
  const { source, fraction = DEFAULT_DEMO_FRACTION, seed = DEFAULT_DEMO_SEED } = event
  if (typeof source !== 'string' || !IMPORT_SOURCE_RE.test(source)) return { ok: false, error: 'source must be import:<dataset>' }
  if (typeof fraction !== 'number' || !(fraction > 0 && fraction <= 1)) return { ok: false, error: 'fraction must be above 0 and at most 1' }
  if (typeof seed !== 'number' || !Number.isSafeInteger(seed)) return { ok: false, error: 'seed must be an integer' }
  const result = await applyDemoNeeds(deps, deps.log, { source, fraction, seed })
  return result.snapshotWritten ? { ok: true, data: { ...result } } : { ok: false, error: 'snapshot failed' }
}

const clearDemoNeedsTask = async (deps: Deps): Promise<TaskResult> => {
  if (deps.config.environment === PROD_ENVIRONMENT) return NOT_ON_PROD
  const result = await clearDemoNeeds(deps, deps.log)
  return result.snapshotWritten ? { ok: true, data: { ...result } } : { ok: false, error: 'snapshot failed' }
}

export const isTaskEvent = (event: unknown): event is { readonly task: unknown } =>
  typeof event === 'object' && event !== null && 'task' in event && !('requestContext' in event)

export const runTask = async (deps: Deps, event: Readonly<Record<string, unknown>>): Promise<TaskResult> => {
  try {
    switch (event.task) {
      case 'invite-admin':
        return await inviteAdmin(deps, event.email)
      case 'rebuild-snapshot': {
        const written = await publishSnapshot(deps, deps.log)
        return written ? { ok: true, data: { written } } : { ok: false, error: 'snapshot failed' }
      }
      case 'import-charities':
        return await importTask(deps, event.items)
      case 'remove-imported':
        return await removeTask(deps, event.source, event.limit)
      case 'demo-needs':
        return await demoNeedsTask(deps, event)
      case 'clear-demo-needs':
        return await clearDemoNeedsTask(deps)
      default:
        return { ok: false, error: 'unknown task' }
    }
  } catch (err) {
    deps.log.error('task failed', { task: String(event.task), ...errorFields(err) })
    return { ok: false, error: 'task failed' }
  }
}
