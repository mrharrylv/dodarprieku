/** Registration: the application itself and the media it uploads. */
import { LIMITS, MEDIA_PREFIX } from '../../../shared/src/contracts'
import { validateApplication } from '../../../shared/src/validate'
import { enforceRateLimit, notifyAdmin } from '../domain/effects'
import { claimUniqueSlug } from '../domain/slug'
import { decodeUpload, isUploadContentType, uploadKey } from '../domain/upload'
import { linksOf } from '../deps'
import { objectBody, ok, type Handler } from '../http/context'
import { ApiError, conflict, validationError } from '../http/errors'
import { maskEmail } from '../log'
import { adminNewApplicationEmail } from '../mail/templates'
import { CACHE_IMMUTABLE, mediaObjectKey } from '../storage/types'

/** A base64 body for the largest image, plus the JSON around it. */
export const UPLOAD_BODY_MAX = Math.ceil((LIMITS.uploadMaxBytes * 4) / 3) + 4096

export const postApplication: Handler = async (ctx) => {
  await enforceRateLimit(ctx, 'applications')
  const body = objectBody(ctx)
  if (typeof body.website === 'string' && body.website !== '') {
    ctx.log.warn('honeypot filled', { route: 'application' })
    return ok({ id: ctx.deps.uuid() })
  }
  const result = validateApplication(body)
  if (!result.ok) throw validationError(result.fields)
  const { profile, accountEmail } = result.value
  const { repo } = ctx.deps
  if (await repo.getAccount(accountEmail)) throw conflict()

  const id = ctx.deps.uuid()
  const now = ctx.deps.now().toISOString()
  const slug = await claimUniqueSlug(repo, profile.organization.name, id, () => id.slice(0, 8))
  await repo.createCharity({
    id,
    status: 'pending',
    slug,
    profile,
    accountEmail,
    views: 0,
    pledges: 0,
    createdAt: now,
    updatedAt: now,
  })
  ctx.log.info('application received', { charityId: id, accountEmail: maskEmail(accountEmail) })
  await notifyAdmin(
    ctx.deps,
    ctx.log,
    adminNewApplicationEmail(linksOf(ctx.deps.config), id, profile.organization.name, profile.address.city),
  )
  return ok({ id })
}

export const postUpload: Handler = async (ctx) => {
  await enforceRateLimit(ctx, 'uploads')
  const body = objectBody(ctx)
  const fields: Record<string, string> = {}
  if (body.kind !== 'photo' && body.kind !== 'logo') fields.kind = 'invalid'
  if (!isUploadContentType(body.contentType)) fields.contentType = 'invalid'
  if (typeof body.dataBase64 !== 'string') fields.dataBase64 = 'required'
  if (Object.keys(fields).length > 0 || !isUploadContentType(body.contentType) || typeof body.dataBase64 !== 'string') {
    throw validationError(fields)
  }
  const decoded = decodeUpload(body.dataBase64, body.contentType)
  if (!decoded.ok) {
    if (decoded.error === 'too_large') throw new ApiError('too_large')
    throw validationError({ dataBase64: 'invalid' })
  }
  const key = uploadKey(ctx.deps.now(), ctx.deps.uuid(), body.contentType)
  await ctx.deps.storage.put(mediaObjectKey(key), {
    body: decoded.bytes,
    contentType: body.contentType,
    cacheControl: CACHE_IMMUTABLE,
  })
  ctx.log.info('upload stored', { kind: body.kind, bytes: decoded.bytes.length })
  return ok({ key, url: `${MEDIA_PREFIX}${key}` })
}
