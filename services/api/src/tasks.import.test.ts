import { describe, expect, it } from 'vitest'
import { MAX_IMPORT_ITEMS, runTask } from './tasks'
import { createTestDeps, putCharity } from './test/helpers'
import { SOURCE, importedItem } from './test/imported'

describe('import-charities task', () => {
  it('imports a batch without rebuilding the snapshot, then rebuild-snapshot publishes it', async () => {
    const deps = createTestDeps()
    const items = [importedItem(1), importedItem(2)]
    expect(await runTask(deps, { task: 'import-charities', items })).toEqual({
      ok: true, data: { imported: 2, created: 2, updated: 0, refused: [] },
    })
    expect(deps.storage.keys()).toEqual([])
    expect(await runTask(deps, { task: 'import-charities', items })).toMatchObject({ ok: true, data: { created: 0, updated: 2 } })
    expect(await runTask(deps, { task: 'rebuild-snapshot' })).toEqual({ ok: true, data: { written: true } })
    expect(deps.mailer.sent()).toEqual([])
    expect(await deps.repo.getAccount('')).toBeUndefined()
  })

  it('refuses a payload that is not a list of imported charities, all of it', async () => {
    const deps = createTestDeps()
    const err = (items: unknown) => runTask(deps, { task: 'import-charities', items })
    expect(await err(undefined)).toEqual({ ok: false, error: 'items must be a non-empty array' })
    expect(await err([])).toEqual({ ok: false, error: 'items must be a non-empty array' })
    expect(await err([importedItem(1), { ...importedItem(2), id: 'c1' }])).toEqual({ ok: false, error: 'item 1 is not an imported charity' })
    expect(await err([importedItem(1), importedItem(1)])).toEqual({ ok: false, error: 'duplicate ids' })
    const tooMany = Array.from({ length: MAX_IMPORT_ITEMS + 1 }, (_, i) => importedItem(i))
    expect(await err(tooMany)).toEqual({ ok: false, error: `at most ${MAX_IMPORT_ITEMS} items per call` })
    expect(await deps.repo.listCharities()).toEqual([])
  })
})

describe('remove-imported task', () => {
  it('removes a source batch by batch, then reports the snapshot', async () => {
    const deps = createTestDeps()
    await putCharity(deps)
    await runTask(deps, { task: 'import-charities', items: [importedItem(1), importedItem(2), importedItem(3)] })
    expect(await runTask(deps, { task: 'remove-imported', source: SOURCE, limit: 2 })).toEqual({ ok: true, data: { removed: 2, remaining: 1 } })
    expect(await runTask(deps, { task: 'remove-imported', source: SOURCE })).toEqual({
      ok: true, data: { removed: 1, remaining: 0, snapshotWritten: true },
    })
    expect((await deps.repo.listCharities()).map((c) => c.id)).toEqual(['c1'])
  })

  it('refuses a source that is not an import, a bad limit, and reports a failed snapshot', async () => {
    const deps = createTestDeps()
    const run = (source: unknown, limit?: unknown) =>
      runTask(deps, { task: 'remove-imported', source, ...(limit === undefined ? {} : { limit }) })
    expect(await run('')).toEqual({ ok: false, error: 'source must be import:<dataset>' })
    expect(await run(undefined)).toEqual({ ok: false, error: 'source must be import:<dataset>' })
    expect(await run('dev')).toMatchObject({ ok: false })
    for (const limit of [0, 1.5, 201, '10']) expect(await run(SOURCE, limit)).toEqual({ ok: false, error: 'limit must be 1-200' })
    const broken = { ...deps, storage: { ...deps.storage, put: async () => { throw new Error('s3 down') } } }
    expect(await runTask(broken, { task: 'remove-imported', source: SOURCE })).toEqual({ ok: false, error: 'snapshot failed' })
  })
})
