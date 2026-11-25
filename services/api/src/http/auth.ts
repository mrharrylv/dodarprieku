/** Session cookie -> account, with the role and session-version checks. */
import { SESSION_COOKIE, type Me, type Role } from '../../../shared/src/contracts'
import { createSessionToken, verifySessionToken } from '../auth/session'
import type { Deps } from '../deps'
import type { AccountRecord } from '../repo/types'
import type { Ctx } from './context'
import { sessionCookie } from './cookies'
import { ApiError } from './errors'

export interface Session {
  readonly account: AccountRecord
  readonly me: Me
}

export const meOf = (a: AccountRecord): Me => ({
  email: a.email,
  role: a.role,
  ...(a.charityId ? { charityId: a.charityId } : {}),
})

/** The signed-in account, or undefined. A stale version or a changed role is no session. */
export const readSession = async (ctx: Ctx): Promise<Session | undefined> => {
  const token = ctx.req.cookies[SESSION_COOKIE]
  if (!token) return undefined
  const payload = verifySessionToken(token, ctx.deps.secrets.sessionSecret, ctx.deps.now())
  if (!payload) return undefined
  const account = await ctx.deps.repo.getAccount(payload.email)
  if (!account || !account.passwordHash) return undefined
  if (account.sessionVersion !== payload.v || account.role !== payload.role) return undefined
  if ((account.charityId ?? undefined) !== payload.charityId) return undefined
  return { account, me: meOf(account) }
}

export const requireSession = async (ctx: Ctx, role?: Role): Promise<Session> => {
  const session = await readSession(ctx)
  if (!session) throw new ApiError('unauthorized')
  if (role && session.account.role !== role) throw new ApiError('forbidden')
  return session
}

/** A charity session that is tied to a charity id. */
export const requireCharity = async (ctx: Ctx): Promise<Session & { readonly charityId: string }> => {
  const session = await requireSession(ctx, 'charity')
  const charityId = session.account.charityId
  if (!charityId) throw new ApiError('forbidden')
  return { ...session, charityId }
}

export const issueSessionCookie = (deps: Deps, account: AccountRecord): string => {
  const token = createSessionToken(
    {
      email: account.email,
      role: account.role,
      ...(account.charityId ? { charityId: account.charityId } : {}),
      v: account.sessionVersion,
    },
    deps.secrets.sessionSecret,
    deps.now(),
  )
  return sessionCookie(token, !deps.config.isLocal)
}
