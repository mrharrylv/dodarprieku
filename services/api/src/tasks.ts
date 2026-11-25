/**
 * Direct invocations (no API Gateway event): only an IAM principal allowed to
 * call lambda:InvokeFunction can reach these.
 *
 *   { "task": "invite-admin", "email": "..." }
 *   { "task": "rebuild-snapshot" }
 */
import { isEmail, normaliseEmail } from '../../shared/src/validate'
import { publishSnapshot, sendMail } from './domain/effects'
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
      default:
        return { ok: false, error: 'unknown task' }
    }
  } catch (err) {
    deps.log.error('task failed', { task: String(event.task), ...errorFields(err) })
    return { ok: false, error: 'task failed' }
  }
}
