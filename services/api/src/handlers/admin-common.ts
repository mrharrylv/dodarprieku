/** Shared by the admin handlers: loading a charity, reasons, the approval invite. */
import { LIMITS } from '../../../shared/src/contracts'
import { sendMail } from '../domain/effects'
import { linksOf, type Deps } from '../deps'
import { requireSession } from '../http/auth'
import { objectBody, param, type Ctx } from '../http/context'
import { notFound, validationError } from '../http/errors'
import type { Logger } from '../log'
import { approvalEmail } from '../mail/templates'
import type { AccountRecord, CharityRecord } from '../repo/types'
import { createToken } from './auth'

export const adminCharity = async (ctx: Ctx): Promise<CharityRecord> => {
  await requireSession(ctx, 'admin')
  const c = await ctx.deps.repo.getCharity(param(ctx, 'id'))
  if (!c) throw notFound()
  return c
}

/** The charity's account, unless it has none (an imported charity's accountEmail is ''). */
export const accountOf = (deps: Deps, c: CharityRecord): Promise<AccountRecord | undefined> =>
  c.accountEmail === '' ? Promise.resolve(undefined) : deps.repo.getAccount(c.accountEmail)

/** The optional `reason` of a ReasonRequest, trimmed; undefined when empty. */
export const readReason = (ctx: Ctx): string | undefined => {
  const raw = objectBody(ctx).reason
  if (raw === undefined || raw === null) return undefined
  if (typeof raw !== 'string') throw validationError({ reason: 'invalid' })
  const reason = raw.trim()
  if (reason.length > LIMITS.rejectReason) throw validationError({ reason: 'too_long' })
  return reason === '' ? undefined : reason
}

type Reasons = 'rejectReason' | 'suspendReason'

/** A copy without the named optional fields (exactOptionalPropertyTypes forbids `undefined`). */
export const withoutReasons = (c: CharityRecord, ...fields: readonly Reasons[]): CharityRecord =>
  Object.fromEntries(Object.entries(c).filter(([k]) => !(fields as readonly string[]).includes(k))) as unknown as CharityRecord

/** A fresh 7-day set-password link to the charity's account email. */
export const sendCharityInvite = async (deps: Deps, log: Logger, c: CharityRecord): Promise<boolean> => {
  if (c.accountEmail === '') return false
  const token = await createToken(deps, c.accountEmail, 'set-password')
  return sendMail(deps, log, c.accountEmail, approvalEmail(linksOf(deps.config), c.profile.organization.name, token))
}
