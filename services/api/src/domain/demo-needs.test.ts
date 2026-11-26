import { describe, expect, it } from 'vitest'
import { CATEGORIES, needItemIds } from '../../../shared/src/catalog'
import { LIMITS } from '../../../shared/src/contracts'
import { DEMO_NEEDS, DEMO_NOTES, demoNeedsFor, isDemoPick } from './demo-needs'

const ids = Array.from({ length: 2000 }, (_, i) => `imp-L${i}`)

describe('isDemoPick', () => {
  it('picks about the share asked for, the same ones every time', () => {
    const picked = ids.filter((id) => isDemoPick(id, 7, 0.25))
    expect(picked.length / ids.length).toBeGreaterThan(0.21)
    expect(picked.length / ids.length).toBeLessThan(0.29)
    expect(ids.filter((id) => isDemoPick(id, 7, 0.25))).toEqual(picked)
  })

  it('another seed picks others; a share of 1 picks every one', () => {
    expect(ids.filter((id) => isDemoPick(id, 8, 0.25))).not.toEqual(ids.filter((id) => isDemoPick(id, 7, 0.25)))
    expect(ids.every((id) => isDemoPick(id, 3, 1))).toBe(true)
  })
})

describe('demoNeedsFor', () => {
  it('gives 2-6 distinct needs from the category, deterministic, within the limits', () => {
    for (const category of CATEGORIES) {
      for (const id of ids.slice(0, 50)) {
        const needs = demoNeedsFor(category.id, id, 1)
        expect(needs.length).toBeGreaterThanOrEqual(DEMO_NEEDS.min)
        expect(needs.length).toBeLessThanOrEqual(DEMO_NEEDS.max)
        expect(new Set(needs.map((n) => n.itemId)).size).toBe(needs.length)
        for (const need of needs) {
          expect(needItemIds(category.id)).toContain(need.itemId)
          if (need.note !== undefined) {
            expect(DEMO_NOTES).toContain(need.note)
            expect(need.note.length).toBeLessThanOrEqual(LIMITS.needNote)
          }
        }
        expect(demoNeedsFor(category.id, id, 1)).toEqual(needs)
      }
    }
  })

  it('marks some urgent and adds some notes, never all of them', () => {
    const all = ids.slice(0, 300).flatMap((id) => demoNeedsFor('bernu-nams', id, 2))
    const urgent = all.filter((n) => n.urgent).length / all.length
    const noted = all.filter((n) => n.note !== undefined).length / all.length
    expect(urgent).toBeGreaterThan(0.1)
    expect(urgent).toBeLessThan(0.4)
    expect(noted).toBeGreaterThan(0.2)
    expect(noted).toBeLessThan(0.5)
  })
})
