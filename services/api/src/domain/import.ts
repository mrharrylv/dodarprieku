/**
 * Bulk import of register data as approved charities, and its undo. No
 * account is created and nothing is mailed: accountEmail stays ''. Neither
 * function rebuilds the snapshot per item; the caller does it once at the end.
 */
import type { Deps } from '../deps'
import type { Logger } from '../log'
import type { CharityRecord } from '../repo/types'
import { publishSnapshot, removeMedia } from './effects'
import type { ImportedCharity } from './imported'
import { claimUniqueSlug } from './slug'

/** Parallel repository calls per batch: enough to finish 100 items well inside the Lambda timeout. */
const CONCURRENCY = 10

const mapLimited = async <T, R>(list: readonly T[], limit: number, work: (item: T) => Promise<R>): Promise<R[]> => {
  const out: R[] = []
  for (let i = 0; i < list.length; i += limit) out.push(...(await Promise.all(list.slice(i, i + limit).map(work))))
  return out
}

export interface ImportResult {
  readonly imported: number
  readonly created: number
  readonly updated: number
  /** Ids not written: never imported, claimed, or saved by an admin since. */
  readonly refused: readonly string[]
}

type Prepared = { readonly record: CharityRecord; readonly created: boolean } | { readonly refused: string }

const prepare = async (deps: Deps, item: ImportedCharity, now: string): Promise<Prepared> => {
  const { repo } = deps
  const existing = await repo.getCharity(item.id)
  if (existing && (existing.source === undefined || existing.editedAt !== undefined)) return { refused: item.id }
  const slug = await claimUniqueSlug(repo, item.slug, item.id, () => item.id.toLowerCase())
  if (existing && existing.slug !== slug) await repo.releaseSlug(existing.slug)
  const record: CharityRecord = {
    id: item.id,
    // An admin's suspension survives a re-import; everything else is the register's.
    status: existing?.status === 'suspended' ? 'suspended' : 'approved',
    slug,
    profile: item.profile,
    accountEmail: '',
    source: item.source,
    views: existing?.views ?? 0,
    pledges: existing?.pledges ?? 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    publishedAt: existing?.publishedAt ?? now,
    ...(existing?.suspendReason ? { suspendReason: existing.suspendReason } : {}),
  }
  return { record, created: existing === undefined }
}

/** Idempotent: the same ids overwrite themselves, and keep their slugs, counters and dates. */
export const importCharities = async (deps: Deps, log: Logger, items: readonly ImportedCharity[]): Promise<ImportResult> => {
  const now = deps.now().toISOString()
  const prepared = await mapLimited(items, CONCURRENCY, (item) => prepare(deps, item, now))
  const attempted = prepared.flatMap((p) => ('record' in p ? [p] : []))
  const lost = new Set(await deps.repo.putCharities(attempted.map((p) => p.record)))
  const records = attempted.filter((p) => !lost.has(p.record.id))
  const refused = [...prepared.flatMap((p) => ('refused' in p ? [p.refused] : [])), ...lost]
  const created = records.filter((p) => p.created).length
  const result = { imported: records.length, created, updated: records.length - created, refused }
  log.info('charities imported', { ...result, refused: refused.length })
  return result
}

export interface RemoveResult {
  readonly removed: number
  readonly remaining: number
  /** Only when nothing of the source remains. */
  readonly snapshotWritten?: boolean
}

/**
 * Deletes up to `limit` charities of `source` (everything under them and their
 * slug claims, nothing else), so one call stays inside the Lambda timeout.
 * When the last one is gone the snapshot is rebuilt.
 */
export const removeImported = async (deps: Deps, log: Logger, source: string, limit: number): Promise<RemoveResult> => {
  const { repo } = deps
  const all = (await repo.listCharities()).filter((c) => c.source === source)
  const batch = all.slice(0, limit)
  await mapLimited(batch, CONCURRENCY, async (c) => {
    await repo.deleteCharity(c.id)
    await repo.releaseSlug(c.slug)
  })
  await removeMedia(deps, log, batch.map((c) => c.profile))
  const remaining = all.length - batch.length
  log.info('imported charities removed', { source, removed: batch.length, remaining })
  if (remaining > 0) return { removed: batch.length, remaining }
  const snapshotWritten = await publishSnapshot(deps, log, { deleted: batch.map((c) => c.id) })
  return { removed: batch.length, remaining, snapshotWritten }
}
