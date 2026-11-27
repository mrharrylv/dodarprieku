/**
 * A re-import must never undo what happened to an imported charity since the
 * register was read: an admin's edit, a merged claim, a counted view.
 */
import { describe, expect, it } from 'vitest'
import { asAdmin, call, data, validProfile, world } from '../test/helpers'
import { importedItem } from '../test/imported'
import type { CharityRecord } from '../repo/types'
import { importCharities } from './import'

describe('re-import over later changes', () => {
  it('refuses a charity whose profile an admin has saved, and keeps the edit', async () => {
    const w = world()
    const admin = await asAdmin(w)
    await importCharities(w.deps, w.deps.log, [importedItem(4)])
    const edited = validProfile({ description: 'ADMIN EDIT' })
    data(await call(w.app, 'PUT', '/admin/charities/imp-L0004/profile', { cookie: admin, body: edited }))
    const res = await importCharities(w.deps, w.deps.log, [importedItem(4)])
    expect(res).toEqual({ imported: 0, created: 0, updated: 0, refused: ['imp-L0004'] })
    const c = await w.deps.repo.getCharity('imp-L0004')
    expect(c?.profile.description).toBe('ADMIN EDIT')
    expect(c?.profile.needs).toHaveLength(2)
  })

  it('keeps counters counted and a claim merged after the import read the record', async () => {
    const w = world()
    await importCharities(w.deps, w.deps.log, [importedItem(1), importedItem(2)])
    const stale = new Map<string, CharityRecord>()
    for (const id of ['imp-L0001', 'imp-L0002']) stale.set(id, (await w.deps.repo.getCharity(id))!)
    // Between the import's read and its write: a view, and a claim merged into imp-L0002.
    await w.deps.repo.incrementViews('imp-L0001')
    const two = stale.get('imp-L0002')!
    const { source: _s, ...claimed } = two
    await w.deps.repo.saveCharity({ ...claimed, accountEmail: 'a@kepa.lv', claimedAt: 'now' })
    const lagging = { ...w.deps, repo: { ...w.deps.repo, getCharity: async (id: string) => stale.get(id) } }
    const res = await importCharities(lagging, w.deps.log, [importedItem(1), importedItem(2)])
    expect(res).toEqual({ imported: 1, created: 0, updated: 1, refused: ['imp-L0002'] })
    expect((await w.deps.repo.getCharity('imp-L0001'))?.views).toBe(1)
    const after = await w.deps.repo.getCharity('imp-L0002')
    expect(after).toMatchObject({ accountEmail: 'a@kepa.lv', claimedAt: 'now' })
    expect(after?.source).toBeUndefined()
  })
})
