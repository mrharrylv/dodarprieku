/**
 * In-memory Repository for tests and the local dev server. Values are cloned
 * on the way in and out, so no caller can reach into the store.
 */
import type { ListRequestRecord, PledgeRecord, SubscriberRecord } from '../../../shared/src/contracts'
import type { AccountRecord, CharityRecord, Repository, TokenRecord, UpdateRecord } from './types'

const clone = <T>(v: T): T => structuredClone(v)
const byNewest = <T extends { createdAt: string }>(a: T, b: T): number => b.createdAt.localeCompare(a.createdAt)

interface Subscriber {
  readonly record: SubscriberRecord
}

export interface MemoryRepository extends Repository {
  /** Test hook: how many tokens are stored. */
  readonly tokenCount: () => number
}

export const createMemoryRepository = (): MemoryRepository => {
  const charities = new Map<string, CharityRecord>()
  const updates = new Map<string, UpdateRecord>()
  const slugs = new Map<string, string>()
  const accounts = new Map<string, AccountRecord>()
  const tokens = new Map<string, TokenRecord>()
  const pledges = new Map<string, PledgeRecord>()
  const needCounts = new Map<string, Readonly<Record<string, number>>>()
  const subscribers = new Map<string, Subscriber>()
  const charitySubs = new Map<string, ReadonlySet<string>>()
  const listRequests = new Map<string, ListRequestRecord>()
  const rates = new Map<string, number>()

  const lrKey = (charityId: string, id: string): string => `${charityId}#${id}`

  return {
    createCharity: async (c) => {
      if (charities.has(c.id)) throw new Error('charity exists')
      charities.set(c.id, clone(c))
    },
    getCharity: async (id) => clone(charities.get(id)),
    saveCharity: async (c) => {
      const old = charities.get(c.id)
      if (!old) throw new Error('charity missing')
      charities.set(c.id, clone({ ...c, views: old.views, pledges: old.pledges }))
    },
    saveClaimMerge: async (c) => {
      const old = charities.get(c.id)
      if (!old) throw new Error('charity missing')
      if (!(old.source ?? '').startsWith('import:') || old.accountEmail !== '' || old.status !== 'approved') return false
      charities.set(c.id, clone({ ...c, views: old.views, pledges: old.pledges }))
      return true
    },
    listCharities: async (status) =>
      [...charities.values()].filter((c) => status === undefined || c.status === status).sort(byNewest).map(clone),
    putCharities: async (list) => {
      const refused: string[] = []
      for (const c of list) {
        const old = charities.get(c.id)
        if (old && (!(old.source ?? '').startsWith('import:') || old.accountEmail !== '')) refused.push(c.id)
        else charities.set(c.id, clone(old ? { ...c, views: old.views, pledges: old.pledges } : c))
      }
      return refused
    },
    deleteCharity: async (id) => {
      charities.delete(id)
      updates.delete(id)
      needCounts.delete(id)
      for (const [k, p] of pledges) if (p.charityId === id) pledges.delete(k)
      for (const [k, r] of listRequests) if (r.charityId === id) listRequests.delete(k)
      for (const email of charitySubs.get(id) ?? []) {
        const s = subscribers.get(email)
        if (s) {
          const charityIds = s.record.charityIds.filter((c) => c !== id)
          subscribers.set(email, { record: { ...s.record, charityIds } })
        }
      }
      charitySubs.delete(id)
    },
    incrementViews: async (id) => {
      const c = charities.get(id)
      if (c) charities.set(id, { ...c, views: c.views + 1 })
    },

    claimSlug: async (slug, charityId) => {
      const owner = slugs.get(slug)
      if (owner !== undefined) return owner === charityId
      slugs.set(slug, charityId)
      return true
    },
    releaseSlug: async (slug) => {
      slugs.delete(slug)
    },

    getUpdate: async (id) => clone(updates.get(id)),
    putUpdate: async (u) => {
      updates.set(u.charityId, clone(u))
    },
    deleteUpdate: async (id) => {
      updates.delete(id)
    },
    listUpdateIds: async () => [...updates.keys()],

    getAccount: async (email) => clone(accounts.get(email)),
    putAccount: async (a) => {
      accounts.set(a.email, clone(a))
    },
    deleteAccount: async (email) => {
      accounts.delete(email)
    },
    putToken: async (t) => {
      tokens.set(t.hash, clone(t))
    },
    consumeToken: async (hash) => {
      const t = tokens.get(hash)
      tokens.delete(hash)
      return clone(t)
    },

    recordPledge: async (p) => {
      pledges.set(`${p.charityId}#${p.createdAt}#${p.id}`, clone(p))
      const c = charities.get(p.charityId)
      if (c) charities.set(c.id, { ...c, pledges: c.pledges + 1 })
      const counts = needCounts.get(p.charityId) ?? {}
      needCounts.set(
        p.charityId,
        p.needs.reduce<Record<string, number>>((acc, k) => ({ ...acc, [k]: (acc[k] ?? 0) + 1 }), { ...counts }),
      )
    },
    listPledges: async (charityId) =>
      [...pledges.values()].filter((p) => charityId === undefined || p.charityId === charityId).sort(byNewest).map(clone),
    getNeedCounts: async (id) => clone(needCounts.get(id) ?? {}),

    upsertSubscriber: async (input) => {
      const old = subscribers.get(input.email)?.record
      const charityIds = [...new Set([...(old?.charityIds ?? []), ...(input.charityId ? [input.charityId] : [])])]
      const name = input.name ?? old?.name
      subscribers.set(input.email, {
        record: {
          email: input.email,
          ...(name === undefined ? {} : { name }),
          charityIds,
          general: input.general || old?.general === true,
          createdAt: old?.createdAt ?? input.consentAt,
        },
      })
      if (input.charityId) {
        charitySubs.set(input.charityId, new Set([...(charitySubs.get(input.charityId) ?? []), input.email]))
      }
    },
    listSubscribers: async () => [...subscribers.values()].map((s) => clone(s.record)).sort(byNewest),
    countCharitySubscribers: async (id) => charitySubs.get(id)?.size ?? 0,

    putListRequest: async (r) => {
      listRequests.set(lrKey(r.charityId, r.id), clone(r))
    },
    getListRequest: async (charityId, id) => clone(listRequests.get(lrKey(charityId, id))),
    listListRequests: async (charityId) =>
      [...listRequests.values()]
        .filter((r) => charityId === undefined || r.charityId === charityId)
        .sort(byNewest)
        .map(clone),

    hitRateLimit: async (key, window) => {
      const k = `${key}#${window}`
      const n = (rates.get(k) ?? 0) + 1
      rates.set(k, n)
      return n
    },

    tokenCount: () => tokens.size,
  }
}
