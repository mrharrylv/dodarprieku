import { describe, expect, it } from 'vitest'
import { buildSnapshot } from './domain/snapshot'
import { runTask } from './tasks'
import { createTestDeps, putCharity, testConfig } from './test/helpers'
import { SOURCE, importedItem } from './test/imported'

const ITEMS = Array.from({ length: 40 }, (_, i) => importedItem(i + 1))

const seeded = async () => {
  const deps = createTestDeps()
  await putCharity(deps)
  await runTask(deps, { task: 'import-charities', items: ITEMS })
  return deps
}

const snapshotOf = async (deps: Awaited<ReturnType<typeof seeded>>) => buildSnapshot(await deps.repo.listCharities(), deps.now())

describe('demo-needs task', () => {
  it('gives a seeded share of the source needs, marks them, and publishes them', async () => {
    const deps = await seeded()
    const result = await runTask(deps, { task: 'demo-needs', source: SOURCE, fraction: 0.5, seed: 4 })
    expect(result).toMatchObject({ ok: true, data: { cleared: 0, snapshotWritten: true } })
    if (!result.ok) throw new Error(result.error)
    const picked = Number(result.data.picked)
    expect(picked).toBeGreaterThan(10)
    expect(picked).toBeLessThan(30)
    const demo = (await snapshotOf(deps)).charities.filter((c) => c.demoNeeds === true)
    expect(demo).toHaveLength(picked)
    expect(demo.every((c) => c.profile.needs.length >= 2)).toBe(true)
    const real = (await deps.repo.getCharity('c1'))!
    expect(real.demoNeeds).toBeUndefined()
    expect(deps.storage.keys()).toContain('data/charities.json')
  })

  it('is deterministic, and another seed replaces the last pick rather than adding to it', async () => {
    const deps = await seeded()
    const ids = async () => (await snapshotOf(deps)).charities.filter((c) => c.demoNeeds).map((c) => c.id)
    await runTask(deps, { task: 'demo-needs', source: SOURCE, seed: 1 })
    const first = await ids()
    await runTask(deps, { task: 'demo-needs', source: SOURCE, seed: 1 })
    expect(await ids()).toEqual(first)
    const again = await runTask(deps, { task: 'demo-needs', source: SOURCE, seed: 99 })
    const second = await ids()
    expect(second).not.toEqual(first)
    const dropped = first.filter((id) => !second.includes(id))
    expect(again).toMatchObject({ ok: true, data: { cleared: dropped.length } })
    for (const id of dropped) expect((await deps.repo.getCharity(id))?.profile.needs).toEqual([])
  })

  it('clear-demo-needs restores no needs for every demo charity and rebuilds', async () => {
    const deps = await seeded()
    await runTask(deps, { task: 'demo-needs', source: SOURCE, fraction: 1, seed: 2 })
    expect(await runTask(deps, { task: 'clear-demo-needs' })).toEqual({ ok: true, data: { cleared: 40, snapshotWritten: true } })
    const snap = await snapshotOf(deps)
    expect(snap.charities.some((c) => 'demoNeeds' in c)).toBe(false)
    expect(snap.charities.filter((c) => c.id.startsWith('imp-')).every((c) => c.profile.needs.length === 0)).toBe(true)
    expect((await deps.repo.getCharity('c1'))?.profile.needs.length).toBeGreaterThan(0)
  })

  it('refuses both on prod, and refuses a bad source, share or seed', async () => {
    const deps = await seeded()
    const prod = { ...deps, config: testConfig({ ENVIRONMENT: 'prod' }) }
    expect(await runTask(prod, { task: 'demo-needs', source: SOURCE })).toEqual({ ok: false, error: 'demo needs are refused on prod' })
    expect(await runTask(prod, { task: 'clear-demo-needs' })).toEqual({ ok: false, error: 'demo needs are refused on prod' })
    const run = (over: Record<string, unknown>) => runTask(deps, { task: 'demo-needs', source: SOURCE, ...over })
    expect(await run({ source: 'dev' })).toEqual({ ok: false, error: 'source must be import:<dataset>' })
    for (const fraction of [0, -1, 1.5, '0.2']) expect(await run({ fraction })).toEqual({ ok: false, error: 'fraction must be above 0 and at most 1' })
    for (const seed of [1.5, '3', Number.MAX_VALUE]) expect(await run({ seed })).toEqual({ ok: false, error: 'seed must be an integer' })
    expect((await deps.repo.listCharities()).some((c) => c.demoNeeds)).toBe(false)
  })

  it('reports a snapshot that could not be written', async () => {
    const deps = await seeded()
    const broken = { ...deps, storage: { ...deps.storage, put: async () => { throw new Error('s3 down') } } }
    expect(await runTask(broken, { task: 'demo-needs', source: SOURCE })).toEqual({ ok: false, error: 'snapshot failed' })
    expect(await runTask(broken, { task: 'clear-demo-needs' })).toEqual({ ok: false, error: 'snapshot failed' })
  })
})
