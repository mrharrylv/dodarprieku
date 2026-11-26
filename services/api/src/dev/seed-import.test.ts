import { describe, expect, it } from 'vitest'
import type { PublicSnapshot } from '../../../shared/src/contracts'
import { silentLogger } from '../log'
import { importedItem } from '../test/imported'
import { IMPORTED_FILE, loadImportedFile, parseImportedFile } from './imported-file'
import { createLocalDeps } from './local'
import { seedDev } from './seed'

describe('import file', () => {
  it('parses a valid file and refuses anything else', () => {
    expect(parseImportedFile(JSON.stringify([importedItem(1)]))).toEqual([importedItem(1)])
    expect(() => parseImportedFile('{}')).toThrow(/JSON array/)
    expect(() => parseImportedFile(JSON.stringify([importedItem(1), { id: 'x' }]))).toThrow(/item 1/)
  })

  it('the committed data/imported-charities.json is valid, with unique ids and slugs', () => {
    const items = loadImportedFile(IMPORTED_FILE)
    expect(items.length).toBeGreaterThan(1000)
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length)
    expect(new Set(items.map((i) => i.slug)).size).toBe(items.length)
  })
})

describe('dev seed with the import', () => {
  it('publishes the six samples and every imported charity, slugs unique', async () => {
    const deps = { ...createLocalDeps({}, () => undefined), log: silentLogger }
    const imported = loadImportedFile()
    await seedDev(deps, { imported })
    const o = await deps.storage.get('data/charities.json')
    const snap = JSON.parse(Buffer.from(o!.body).toString('utf8')) as PublicSnapshot
    expect(snap.charities).toHaveLength(6 + imported.length)
    expect(new Set(snap.charities.map((c) => c.slug)).size).toBe(snap.charities.length)
    expect(snap.charities.filter((c) => c.id.startsWith('imp-')).every((c) => c.profile.needs.length === 0)).toBe(true)
  })
  it('with demo needs, a quarter of the imported get made-up needs and are marked; the samples are not', async () => {
    const deps = { ...createLocalDeps({}, () => undefined), log: silentLogger }
    const imported = loadImportedFile()
    await seedDev(deps, { imported, demoNeeds: { fraction: 0.25, seed: 1 } })
    const o = await deps.storage.get('data/charities.json')
    const snap = JSON.parse(Buffer.from(o!.body).toString('utf8')) as PublicSnapshot
    const demo = snap.charities.filter((c) => c.demoNeeds === true)
    expect(demo.length / imported.length).toBeGreaterThan(0.2)
    expect(demo.length / imported.length).toBeLessThan(0.3)
    expect(demo.every((c) => c.id.startsWith('imp-') && c.profile.needs.length >= 2)).toBe(true)
    expect(snap.charities.filter((c) => c.id.startsWith('dev-')).some((c) => c.demoNeeds)).toBe(false)
  })
})
