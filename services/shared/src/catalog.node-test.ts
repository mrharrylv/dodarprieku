// Run with: npm test (node:test, with Node's own type stripping: this package installs no test runner).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CATEGORIES, NEED_GROUP_KIND, NEED_ITEM_KIND, NEED_KINDS, isNeedKindId, needKindOf } from './catalog.ts'

const groups = CATEGORIES.flatMap((c) => c.needs)
const items = groups.flatMap((g) => g.items)

test('every catalog group maps to exactly one need kind', () => {
  for (const group of groups) {
    const kind = NEED_GROUP_KIND[group.id]
    assert.ok(kind !== undefined, `group ${group.id} has no kind`)
    assert.ok(isNeedKindId(kind), `group ${group.id} maps to unknown kind ${kind}`)
  }
})

test('the mapping names no group or item the catalog does not have', () => {
  const groupIds = new Set(groups.map((g) => g.id))
  for (const id of Object.keys(NEED_GROUP_KIND)) assert.ok(groupIds.has(id), `stale group ${id}`)
  const itemIds = new Set(items.map((i) => i.id))
  for (const [id, kind] of Object.entries(NEED_ITEM_KIND)) {
    assert.ok(itemIds.has(id), `stale item ${id}`)
    assert.ok(isNeedKindId(kind), `item ${id} maps to unknown kind ${kind}`)
  }
})

test('every kind is reachable, and ids are unique', () => {
  assert.equal(new Set(NEED_KINDS.map((k) => k.id)).size, NEED_KINDS.length)
  const used = new Set(CATEGORIES.flatMap((c) => c.needs.flatMap((g) => g.items.map((i) => needKindOf(c.id, i.id)))))
  for (const kind of NEED_KINDS) assert.ok(used.has(kind.id), `no catalog item is ${kind.id}`)
})

test('needKindOf: the group kind, an item exception, and null for custom or unknown items', () => {
  assert.equal(needKindOf('dzivnieku-patversme', 'sausa-bariba-suniem'), 'dzivnieki')
  assert.equal(needKindOf('bernu-nams', 'apavi'), 'apgerbs')
  assert.equal(needKindOf('bernu-nams', 'rotallietas-berniem'), 'brivais-laiks')
  assert.equal(needKindOf('cits', 'ziepes'), 'higiena')
  assert.equal(needKindOf('cits', 'custom'), null)
  assert.equal(needKindOf('cits', 'sausa-bariba-suniem'), null)
  assert.equal(isNeedKindId('nope'), false)
})

test('"Cita organizācija" has its own warm tone, never a grey one', () => {
  assert.equal(CATEGORIES.find((c) => c.id === 'cits')?.tone, 'brown')
})
