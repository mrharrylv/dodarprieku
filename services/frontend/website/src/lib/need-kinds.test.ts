import { describe, expect, it } from 'vitest'

import { NEED_KINDS } from '@shared/catalog'
import { hasDemoNeeds, hasNeeds, matchesKinds, needKindsOf, toggleKind } from './need-kinds'
import { childrenHome, shelter } from './snapshot.fixtures'

const ORDER = NEED_KINDS.map((k) => k.id)

describe('need kinds of a charity', () => {
  it('knows whether it needs anything', () => {
    expect(hasNeeds(shelter)).toBe(true)
    expect(hasNeeds(childrenHome)).toBe(false)
  })

  it('folds its needs into kinds, custom ones left out', () => {
    expect([...needKindsOf(shelter)]).toEqual(['dzivnieki'])
    expect(needKindsOf(childrenHome).size).toBe(0)
    const custom = { ...shelter, profile: { ...shelter.profile, needs: [{ itemId: 'custom', customLabel: 'Būdas', urgent: false }] } }
    expect(needKindsOf(custom).size).toBe(0)
  })

  it('matches every charity with no kind chosen, otherwise any one of them', () => {
    expect(matchesKinds(childrenHome, [])).toBe(true)
    expect(matchesKinds(shelter, ['macibas', 'dzivnieki'])).toBe(true)
    expect(matchesKinds(shelter, ['macibas'])).toBe(false)
    expect(matchesKinds(childrenHome, ['dzivnieki'])).toBe(false)
  })

  it('says when any needs on the map are made up', () => {
    expect(hasDemoNeeds([shelter, childrenHome])).toBe(false)
    expect(hasDemoNeeds([shelter, { ...childrenHome, demoNeeds: true }])).toBe(true)
    expect(hasDemoNeeds([])).toBe(false)
  })

  it('toggles a kind, keeping the catalog order, without touching its input', () => {
    const chosen = ['macibas'] as const
    expect(toggleKind(chosen, 'apgerbs', ORDER)).toEqual(['apgerbs', 'macibas'])
    expect(toggleKind(['apgerbs', 'macibas'], 'apgerbs', ORDER)).toEqual(['macibas'])
    expect(chosen).toEqual(['macibas'])
  })
})
