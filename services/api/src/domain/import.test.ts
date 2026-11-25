import { describe, expect, it } from 'vitest'
import type { PublicSnapshot } from '../../../shared/src/contracts'
import { createTestDeps, putCharity } from '../test/helpers'
import { SOURCE, importedItem } from '../test/imported'
import { publishSnapshot } from './effects'
import { importCharities, removeImported } from './import'

const snapshotOf = async (deps: ReturnType<typeof createTestDeps>): Promise<PublicSnapshot> => {
  const o = await deps.storage.get('data/charities.json')
  return JSON.parse(Buffer.from(o!.body).toString('utf8')) as PublicSnapshot
}

describe('importCharities', () => {
  it('stores approved charities without accounts or mail, and does not touch the snapshot', async () => {
    const deps = createTestDeps()
    const res = await importCharities(deps, deps.log, [importedItem(1), importedItem(2)])
    expect(res).toEqual({ imported: 2, created: 2, updated: 0, refused: [] })
    const c = await deps.repo.getCharity('imp-L0001')
    expect(c).toMatchObject({
      status: 'approved', slug: 'dienas-centrs-1', accountEmail: '', source: SOURCE, views: 0,
      createdAt: '2026-11-25T10:00:00.000Z', publishedAt: '2026-11-25T10:00:00.000Z',
    })
    expect(deps.mailer.sent()).toEqual([])
    expect(deps.storage.keys()).toEqual([])
    expect(await deps.repo.claimSlug('dienas-centrs-1', 'someone-else')).toBe(false)
  })

  it('is idempotent: a re-run overwrites, keeps slug, counters, dates and a suspension', async () => {
    const deps = createTestDeps()
    await importCharities(deps, deps.log, [importedItem(1), importedItem(2)])
    await deps.repo.incrementViews('imp-L0001')
    const two = (await deps.repo.getCharity('imp-L0002'))!
    await deps.repo.saveCharity({ ...two, status: 'suspended', suspendReason: 'slēgts' })
    deps.setNow('2026-12-01T00:00:00.000Z')
    const renamed = importedItem(1, { profile: { ...importedItem(1).profile, description: 'Jauns apraksts.' } })
    const res = await importCharities(deps, deps.log, [renamed, importedItem(2)])
    expect(res).toEqual({ imported: 2, created: 0, updated: 2, refused: [] })
    expect(await deps.repo.getCharity('imp-L0001')).toMatchObject({
      slug: 'dienas-centrs-1', views: 1, createdAt: '2026-11-25T10:00:00.000Z',
      updatedAt: '2026-12-01T00:00:00.000Z', profile: { description: 'Jauns apraksts.' },
    })
    expect(await deps.repo.getCharity('imp-L0002')).toMatchObject({ status: 'suspended', suspendReason: 'slēgts' })
    expect(await deps.repo.listCharities()).toHaveLength(2)
  })

  it('suffixes a slug another charity holds, and moves a changed slug, releasing the old one', async () => {
    const deps = createTestDeps()
    await putCharity(deps, { id: 'c1', slug: 'dienas-centrs-1' })
    await importCharities(deps, deps.log, [importedItem(1)])
    expect((await deps.repo.getCharity('imp-L0001'))?.slug).toBe('dienas-centrs-1-2')
    await importCharities(deps, deps.log, [importedItem(1)])
    expect((await deps.repo.getCharity('imp-L0001'))?.slug).toBe('dienas-centrs-1-2')
    await importCharities(deps, deps.log, [importedItem(1, { slug: 'jauns' })])
    expect((await deps.repo.getCharity('imp-L0001'))?.slug).toBe('jauns')
    expect(await deps.repo.claimSlug('dienas-centrs-1-2', 'other')).toBe(true)
  })

  it('never overwrites a charity that was not imported', async () => {
    const deps = createTestDeps()
    await putCharity(deps, { id: 'imp-L0001', slug: 'kepa' })
    const res = await importCharities(deps, deps.log, [importedItem(1), importedItem(2)])
    expect(res).toEqual({ imported: 1, created: 1, updated: 0, refused: ['imp-L0001'] })
    expect((await deps.repo.getCharity('imp-L0001'))?.accountEmail).toBe('owner@kepa.example.com')
  })

  it('handles many items in parallel batches and the snapshot then lists them all', async () => {
    const deps = createTestDeps()
    await putCharity(deps)
    const items = Array.from({ length: 37 }, (_, i) => importedItem(i + 1))
    expect((await importCharities(deps, deps.log, items)).imported).toBe(37)
    await publishSnapshot(deps, deps.log)
    const snap = await snapshotOf(deps)
    expect(snap.charities).toHaveLength(38)
    expect(JSON.stringify(snap)).not.toContain('Nav norādīts')
  })
})

describe('removeImported', () => {
  it('removes only the given source, in batches, and rebuilds the snapshot at the end', async () => {
    const deps = createTestDeps()
    await putCharity(deps)
    await importCharities(deps, deps.log, Array.from({ length: 5 }, (_, i) => importedItem(i + 1)))
    await importCharities(deps, deps.log, [importedItem(9, { source: 'import:other' })])
    expect(await removeImported(deps, deps.log, SOURCE, 3)).toEqual({ removed: 3, remaining: 2 })
    expect(deps.storage.keys()).toEqual([])
    expect(await removeImported(deps, deps.log, SOURCE, 3)).toEqual({ removed: 2, remaining: 0, snapshotWritten: true })
    const ids = (await deps.repo.listCharities()).map((c) => c.id).sort()
    expect(ids).toEqual(['c1', 'imp-L0009'])
    expect(await deps.repo.claimSlug('dienas-centrs-1', 'x')).toBe(true)
    expect(await deps.repo.claimSlug('kepa', 'x')).toBe(false)
    expect((await snapshotOf(deps)).charities.map((c) => c.id).sort()).toEqual(['c1', 'imp-L0009'])
    expect(await removeImported(deps, deps.log, SOURCE, 3)).toEqual({ removed: 0, remaining: 0, snapshotWritten: true })
  })
})
