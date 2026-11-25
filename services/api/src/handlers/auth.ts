/** Login, logout, me, set-password (from an emailed token) and forgot-password. */
import { LIMITS } from '../../../shared/src/contracts'
import { isEmail, normaliseEmail, validatePassword } from '../../../shared/src/validate'
import { DUMMY_HASH, hashPassword, verifyPassword } from '../auth/password'
import { TOKEN_TTL_SECONDS, hashToken, newToken, type TokenPurpose } from '../auth/tokens'
import { enforceRateLimit, sendMail } from '../domain/effects'
import { linksOf, withFloor, type Deps } from '../deps'
import { issueSessionCookie, meOf, readSession, requireSession } from '../http/auth'
import { objectBody, ok, type Handler } from '../http/context'
import { clearSessionCookie } from '../http/cookies'
import { ApiError, validationError } from '../http/errors'
import { maskEmail, type Logger } from '../log'
import { adminResetPasswordUrl, resetEmail, resetPasswordUrl } from '../mail/templates'
import type { AccountRecord } from '../repo/types'

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

export const postLogin: Handler = async (ctx) => {
  await enforceRateLimit(ctx, 'login')
  const body = objectBody(ctx)
  const email = normaliseEmail(str(body.email))
  const password = str(body.password)
  if (email === '' || password === '' || password.length > LIMITS.passwordMax) throw new ApiError('unauthorized')
  const account = await ctx.deps.repo.getAccount(email)
  const valid = await verifyPassword(password, account?.passwordHash ?? DUMMY_HASH)
  if (!account || !account.passwordHash || !valid) {
    ctx.log.warn('login failed', { email: maskEmail(email) })
    throw new ApiError('unauthorized')
  }
  ctx.log.info('login', { email: maskEmail(email), role: account.role })
  return ok(meOf(account), [issueSessionCookie(ctx.deps, account)])
}

/**
 * Clears the cookie and, when the session is valid, bumps the account's
 * sessionVersion so a copied token stops working too. That signs the account
 * out on every device, which is the safer trade for a shared-computer site.
 */
export const postLogout: Handler = async (ctx) => {
  const session = await readSession(ctx)
  if (session) {
    const { account } = session
    await ctx.deps.repo.putAccount({
      ...account,
      sessionVersion: account.sessionVersion + 1,
      updatedAt: ctx.deps.now().toISOString(),
    })
    ctx.log.info('logout', { email: maskEmail(account.email) })
  }
  return ok({}, [clearSessionCookie(!ctx.deps.config.isLocal)])
}

export const getMe: Handler = async (ctx) => {
  const session = await requireSession(ctx)
  return ok(session.me)
}

/** Creates a single-use token for an account and returns the raw token for the link. */
export const createToken = async (deps: Deps, email: string, purpose: TokenPurpose): Promise<string> => {
  const token = newToken()
  const expiresAt = Math.floor(deps.now().getTime() / 1000) + TOKEN_TTL_SECONDS[purpose]
  await deps.repo.putToken({ hash: hashToken(token), purpose, email, expiresAt })
  return token
}

export const postSetPassword: Handler = async (ctx) => {
  await enforceRateLimit(ctx, 'set-password')
  const body = objectBody(ctx)
  const problem = validatePassword(body.password)
  if (problem) throw validationError({ password: problem })
  const token = str(body.token)
  if (token === '') throw new ApiError('token_invalid')
  const { repo } = ctx.deps
  const record = await repo.consumeToken(hashToken(token))
  const nowSeconds = Math.floor(ctx.deps.now().getTime() / 1000)
  if (!record || record.expiresAt <= nowSeconds) throw new ApiError('token_invalid')
  const account = await repo.getAccount(record.email)
  if (!account) throw new ApiError('token_invalid')
  const updated: AccountRecord = {
    ...account,
    passwordHash: await hashPassword(body.password as string),
    sessionVersion: account.sessionVersion + 1,
    updatedAt: ctx.deps.now().toISOString(),
  }
  await repo.putAccount(updated)
  ctx.log.info('password set', { email: maskEmail(updated.email), purpose: record.purpose })
  return ok(meOf(updated), [issueSessionCookie(ctx.deps, updated)])
}

const sendReset = async (deps: Deps, log: Logger, account: AccountRecord): Promise<void> => {
  const token = await createToken(deps, account.email, 'reset')
  const links = linksOf(deps.config)
  const url = account.role === 'admin' ? adminResetPasswordUrl(links, token) : resetPasswordUrl(links, token)
  await sendMail(deps, log, account.email, resetEmail(url))
}

/** Long enough to cover a token write plus an SES send, so both paths take the same time. */
export const FORGOT_FLOOR_MS = 1500

/** Always `{}` after the same minimum time: whether the account exists is never revealed. */
export const postForgot: Handler = async (ctx) => {
  await enforceRateLimit(ctx, 'forgot')
  const body = objectBody(ctx)
  const email = normaliseEmail(str(body.email))
  if (!isEmail(email)) throw validationError({ email: email === '' ? 'required' : 'invalid' })
  await withFloor(ctx.deps, FORGOT_FLOOR_MS, async () => {
    const account = await ctx.deps.repo.getAccount(email)
    if (account) await sendReset(ctx.deps, ctx.log, account)
    else ctx.log.info('reset for unknown account', { email: maskEmail(email) })
  })
  return ok({})
}
