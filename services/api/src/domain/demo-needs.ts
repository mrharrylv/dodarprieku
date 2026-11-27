/**
 * Made-up needs for a demonstration of the map, on dev and locally only: the
 * imported register charities have none, so every pin would be greyed out.
 * A deterministic share of one import source gets 2-6 needs from its own
 * category's catalog and `demoNeeds: true`, which the snapshot carries and the
 * map announces. `clearDemoNeeds` puts every one of them back to no needs.
 *
 * Pure generation (seeded, no Math.random) plus the two repository passes;
 * the tasks refuse both on production.
 */
import { needItemIds } from '../../../shared/src/catalog'
import type { CategoryId } from '../../../shared/src/catalog'
import type { CharityProfile, Need } from '../../../shared/src/contracts'
import type { Deps } from '../deps'
import type { Logger } from '../log'
import type { CharityRecord } from '../repo/types'
import { publishSnapshot } from './effects'

export const DEMO_NEEDS = { min: 2, max: 6, urgentShare: 0.25, noteShare: 0.35 } as const
export const DEFAULT_DEMO_FRACTION = 0.25
export const DEFAULT_DEMO_SEED = 1

/** Short notes a charity might really write; generic enough for any item. */
export const DEMO_NOTES: readonly string[] = [
  'Jaunas vai labā stāvoklī',
  'Lūdzu, iepriekš piezvaniet',
  'Vislabāk līdz mēneša beigām',
  'Noderēs jebkurā daudzumā',
  'Īpaši gaidām ziemai',
]

/** FNV-1a, 32 bit: a stable number for a string. */
const hash32 = (text: string): number => {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

/** mulberry32: a small seeded generator of numbers in [0, 1). */
const generator = (seed: number): (() => number) => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

/** Whether a charity is among the `fraction` picked for `seed`: the same answer every run. */
export const isDemoPick = (id: string, seed: number, fraction: number): boolean =>
  generator(hash32(`${seed}:pick:${id}`))() < fraction

/** 2-6 distinct catalog needs of the category, some urgent, some with a note. */
export const demoNeedsFor = (category: CategoryId, id: string, seed: number): readonly Need[] => {
  const next = generator(hash32(`${seed}:needs:${id}`))
  const pool = [...needItemIds(category)]
  const count = Math.min(pool.length, DEMO_NEEDS.min + Math.floor(next() * (DEMO_NEEDS.max - DEMO_NEEDS.min + 1)))
  const needs: Need[] = []
  for (let i = 0; i < count; i += 1) {
    const [itemId] = pool.splice(Math.floor(next() * pool.length), 1)
    if (itemId === undefined) break
    const urgent = next() < DEMO_NEEDS.urgentShare
    const note = next() < DEMO_NEEDS.noteShare ? DEMO_NOTES[Math.floor(next() * DEMO_NOTES.length)] : undefined
    needs.push({ itemId, urgent, ...(note === undefined ? {} : { note }) })
  }
  return needs
}

/**
 * The charity with a profile someone really saved (an admin edit, an approved
 * update): its needs are no longer made up, so the demo flag goes, and a later
 * clear-demo-needs never wipes them.
 */
export const withSavedProfile = (c: CharityRecord, profile: CharityProfile, now: string): CharityRecord => {
  const { demoNeeds: _demo, ...rest } = c
  return { ...rest, profile, updatedAt: now }
}

const withoutDemo = (c: CharityRecord, now: string): CharityRecord =>
  withSavedProfile(c, { ...c.profile, needs: [] }, now)

export interface DemoNeedsResult {
  readonly picked: number
  /** Charities that had demo needs from an earlier run and were not picked this time. */
  readonly cleared: number
  readonly snapshotWritten: boolean
}

/**
 * Gives the picked charities of `source` demo needs, and takes them from any
 * earlier pick that is not picked now, so a run with another seed or share
 * replaces the last one. Charities with real needs are never touched.
 */
export const applyDemoNeeds = async (
  deps: Deps,
  log: Logger,
  opts: { readonly source: string; readonly fraction: number; readonly seed: number },
): Promise<DemoNeedsResult> => {
  const now = deps.now().toISOString()
  const all = (await deps.repo.listCharities()).filter((c) => c.source === opts.source)
  const open = all.filter((c) => c.demoNeeds === true || c.profile.needs.length === 0)
  const picked = open
    .filter((c) => isDemoPick(c.id, opts.seed, opts.fraction))
    .map((c): CharityRecord => ({
      ...c,
      profile: { ...c.profile, needs: demoNeedsFor(c.profile.category, c.id, opts.seed) },
      demoNeeds: true,
      updatedAt: now,
    }))
  const pickedIds = new Set(picked.map((c) => c.id))
  const cleared = open.filter((c) => c.demoNeeds === true && !pickedIds.has(c.id)).map((c) => withoutDemo(c, now))
  const lost = new Set(await deps.repo.putCharities([...picked, ...cleared]))
  if (lost.size > 0) log.warn('demo needs skipped: claimed meanwhile', { count: lost.size })
  log.info('demo needs applied', { source: opts.source, picked: picked.length, cleared: cleared.length, seed: opts.seed })
  const written = [...picked, ...cleared].filter((c) => !lost.has(c.id))
  const snapshotWritten = await publishSnapshot(deps, log, { written })
  return { picked: picked.length, cleared: cleared.length, snapshotWritten }
}

/** Every charity with demo needs back to none, then the snapshot. */
export const clearDemoNeeds = async (deps: Deps, log: Logger): Promise<{ readonly cleared: number; readonly snapshotWritten: boolean }> => {
  const now = deps.now().toISOString()
  const cleared = (await deps.repo.listCharities()).filter((c) => c.demoNeeds === true).map((c) => withoutDemo(c, now))
  const lost = new Set(await deps.repo.putCharities(cleared))
  const written = cleared.filter((c) => !lost.has(c.id))
  log.info('demo needs cleared', { cleared: written.length, skipped: lost.size })
  return { cleared: written.length, snapshotWritten: await publishSnapshot(deps, log, { written }) }
}
