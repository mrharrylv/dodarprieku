/** Admin: approve, reject, suspend, restore, re-invite, and pending updates. */
import { publishSnapshot, removeMedia, sendMail } from '../domain/effects'
import { loadDetail } from '../domain/views'
import { linksOf } from '../deps'
import { ok, type Handler } from '../http/context'
import { conflict, validationError } from '../http/errors'
import { applicationRejectedEmail, updateApprovedEmail, updateRejectedEmail } from '../mail/templates'
import type { AccountRecord, CharityRecord } from '../repo/types'
import { withSavedProfile } from '../domain/demo-needs'
import { accountOf, adminCharity, readReason, sendCharityInvite, withoutReasons } from './admin-common'

export const approveCharity: Handler = async (ctx) => {
  const c = await adminCharity(ctx)
  if (c.status !== 'pending' && c.status !== 'rejected') throw conflict()
  const { repo } = ctx.deps
  const now = ctx.deps.now().toISOString()
  const existing = await accountOf(ctx.deps, c)
  if (existing && (existing.role !== 'charity' || existing.charityId !== c.id)) throw conflict()
  if (!existing && c.accountEmail !== '') {
    const account: AccountRecord = {
      email: c.accountEmail, role: 'charity', charityId: c.id, sessionVersion: 0, createdAt: now, updatedAt: now,
    }
    await repo.putAccount(account)
  }
  const updated: CharityRecord = {
    ...withoutReasons(c, 'rejectReason', 'suspendReason'),
    status: 'approved',
    publishedAt: c.publishedAt ?? now,
    updatedAt: now,
  }
  await repo.saveCharity(updated)
  ctx.log.info('charity approved', { charityId: c.id })
  const snapshotWritten = await publishSnapshot(ctx.deps, ctx.log)
  const mailSent = await sendCharityInvite(ctx.deps, ctx.log, updated)
  return ok({ ...(await loadDetail(repo, updated)), mailSent, snapshotWritten })
}

export const rejectCharity: Handler = async (ctx) => {
  const c = await adminCharity(ctx)
  if (c.status !== 'pending') throw conflict()
  const reason = readReason(ctx)
  const updated: CharityRecord = {
    ...withoutReasons(c, 'rejectReason'),
    status: 'rejected',
    ...(reason ? { rejectReason: reason } : {}),
    updatedAt: ctx.deps.now().toISOString(),
  }
  await ctx.deps.repo.saveCharity(updated)
  ctx.log.info('charity rejected', { charityId: c.id })
  const message = applicationRejectedEmail(linksOf(ctx.deps.config), c.profile.organization.name, reason)
  const mailSent = await sendMail(ctx.deps, ctx.log, c.accountEmail, message)
  return ok({ ...(await loadDetail(ctx.deps.repo, updated)), mailSent })
}

export const suspendCharity: Handler = async (ctx) => {
  const c = await adminCharity(ctx)
  if (c.status !== 'approved') throw conflict()
  const reason = readReason(ctx)
  const updated: CharityRecord = {
    ...withoutReasons(c, 'suspendReason'),
    status: 'suspended',
    ...(reason ? { suspendReason: reason } : {}),
    updatedAt: ctx.deps.now().toISOString(),
  }
  await ctx.deps.repo.saveCharity(updated)
  ctx.log.info('charity suspended', { charityId: c.id })
  const snapshotWritten = await publishSnapshot(ctx.deps, ctx.log)
  return ok({ ...(await loadDetail(ctx.deps.repo, updated)), snapshotWritten })
}

export const restoreCharity: Handler = async (ctx) => {
  const c = await adminCharity(ctx)
  if (c.status !== 'suspended') throw conflict()
  const updated: CharityRecord = {
    ...withoutReasons(c, 'suspendReason'),
    status: 'approved',
    updatedAt: ctx.deps.now().toISOString(),
  }
  await ctx.deps.repo.saveCharity(updated)
  ctx.log.info('charity restored', { charityId: c.id })
  const snapshotWritten = await publishSnapshot(ctx.deps, ctx.log)
  return ok({ ...(await loadDetail(ctx.deps.repo, updated)), snapshotWritten })
}

export const resendInvite: Handler = async (ctx) => {
  const c = await adminCharity(ctx)
  if (c.status !== 'approved' && c.status !== 'suspended') throw conflict()
  // An imported charity has no account to invite: an admin must give it an email first.
  if (c.accountEmail === '') throw validationError({ accountEmail: 'required' })
  const account = await ctx.deps.repo.getAccount(c.accountEmail)
  if (!account || account.charityId !== c.id) throw conflict()
  const mailSent = await sendCharityInvite(ctx.deps, ctx.log, c)
  return ok({ mailSent })
}

export const approveUpdate: Handler = async (ctx) => {
  const c = await adminCharity(ctx)
  const { repo } = ctx.deps
  const pending = await repo.getUpdate(c.id)
  if (!pending) throw conflict()
  const updated: CharityRecord = withSavedProfile(c, pending.profile, ctx.deps.now().toISOString())
  await repo.saveCharity(updated)
  await repo.deleteUpdate(c.id)
  ctx.log.info('update approved', { charityId: c.id })
  await removeMedia(ctx.deps, ctx.log, [c.profile], [updated.profile])
  const snapshotWritten = await publishSnapshot(ctx.deps, ctx.log)
  const message = updateApprovedEmail(linksOf(ctx.deps.config), updated.profile.organization.name, c.slug)
  const mailSent = await sendMail(ctx.deps, ctx.log, c.accountEmail, message)
  return ok({ ...(await loadDetail(repo, updated)), mailSent, snapshotWritten })
}

export const rejectUpdate: Handler = async (ctx) => {
  const c = await adminCharity(ctx)
  const { repo } = ctx.deps
  const pending = await repo.getUpdate(c.id)
  if (!pending) throw conflict()
  const reason = readReason(ctx)
  await repo.deleteUpdate(c.id)
  ctx.log.info('update rejected', { charityId: c.id })
  await removeMedia(ctx.deps, ctx.log, [pending.profile], [c.profile])
  const message = updateRejectedEmail(linksOf(ctx.deps.config), c.profile.organization.name, reason)
  const mailSent = await sendMail(ctx.deps, ctx.log, c.accountEmail, message)
  return ok({ ...(await loadDetail(repo, c)), mailSent })
}
