// Run with: node --test services/shared/scripts/parcel-lockers-lib.node-test.mjs
// node:test rather than vitest because this package has no dev dependencies installed,
// and the snapshot script itself must stay dependency-free.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  coords,
  countByProvider,
  finalise,
  normaliseOmniva,
  normaliseRows,
  normaliseVenipak,
  serialise,
} from './parcel-lockers-lib.mjs'

const omnivaRow = (over = {}) => ({
  ZIP: '9595',
  NAME: 'Aglonas TOP pakomāts',
  TYPE: '0',
  A0_NAME: 'LV',
  A1_NAME: 'Preiļu novads',
  A2_NAME: 'Aglonas pagasts',
  A3_NAME: 'Aglona',
  A5_NAME: 'Somersētas iela',
  A6_NAME: '',
  A7_NAME: '33',
  A8_NAME: '',
  X_COORDINATE: '27.007230',
  Y_COORDINATE: '56.131607',
  ...over,
})

const venipakRow = (over = {}) => ({
  id: 3041,
  name: 'Venipak locker, ELVI Venipak pakomāts',
  display_name: 'Ādažu Rīgas gatves ELVI Venipak pakomāts',
  address: 'Rīgas gatve 51',
  city: 'Ādaži',
  country: 'LV',
  lat: '57.0798560',
  lng: '24.3174738',
  type: 3,
  ...over,
})

test('coords keeps Latvian points and drops others', () => {
  assert.deepEqual(coords('56.95', '24.1'), { lat: 56.95, lng: 24.1 })
  assert.deepEqual(coords('59.43', '24.75'), {})
  assert.deepEqual(coords('', '24.1'), {})
  assert.deepEqual(coords('abc', 'def'), {})
  assert.deepEqual(coords('56.1234567', '24.7654321'), { lat: 56.123457, lng: 24.765432 })
})

test('normaliseOmniva maps fields, X is longitude and Y latitude', () => {
  assert.deepEqual(normaliseOmniva(omnivaRow()), {
    provider: 'omniva',
    id: '9595',
    name: 'Aglonas TOP pakomāts',
    address: 'Somersētas iela 33',
    city: 'Aglona',
    lat: 56.131607,
    lng: 27.00723,
  })
})

test('normaliseOmniva falls back through city levels and house names', () => {
  const town = normaliseOmniva(omnivaRow({ A2_NAME: 'Aizkraukle', A3_NAME: '' }))
  assert.equal(town.city, 'Aizkraukle')
  const capital = normaliseOmniva(omnivaRow({ A1_NAME: 'Rīga', A2_NAME: '', A3_NAME: '' }))
  assert.equal(capital.city, 'Rīga')
  const house = normaliseOmniva(omnivaRow({ A5_NAME: '', A7_NAME: '', A6_NAME: 'Līdumnieki' }))
  assert.equal(house.address, 'Līdumnieki')
  const flat = normaliseOmniva(omnivaRow({ A8_NAME: 'k-2' }))
  assert.equal(flat.address, 'Somersētas iela 33, k-2')
  const bare = normaliseOmniva(omnivaRow({ A5_NAME: '', A7_NAME: '' }))
  assert.equal(bare.address, 'Aglona')
})

test('normaliseOmniva rejects other countries and broken rows', () => {
  assert.equal(normaliseOmniva(omnivaRow({ A0_NAME: 'EE' })), null)
  assert.equal(normaliseOmniva(omnivaRow({ ZIP: '' })), null)
  assert.equal(normaliseOmniva(omnivaRow({ NAME: '  ' })), null)
  assert.equal(normaliseOmniva(null), null)
})

test('normaliseOmniva omits coordinates outside Latvia', () => {
  const row = normaliseOmniva(omnivaRow({ X_COORDINATE: '0', Y_COORDINATE: '0' }))
  assert.equal('lat' in row, false)
  assert.equal('lng' in row, false)
})

test('normaliseVenipak maps fields and prefers display_name', () => {
  assert.deepEqual(normaliseVenipak(venipakRow()), {
    provider: 'venipak',
    id: '3041',
    name: 'Ādažu Rīgas gatves ELVI Venipak pakomāts',
    address: 'Rīgas gatve 51',
    city: 'Ādaži',
    lat: 57.079856,
    lng: 24.317474,
  })
  assert.equal(normaliseVenipak(venipakRow({ display_name: '' })).name, 'Venipak locker, ELVI Venipak pakomāts')
  assert.equal(normaliseVenipak(venipakRow({ address: '' })).address, 'Ādaži')
  assert.equal(normaliseVenipak(venipakRow({ country: 'LT' })), null)
  assert.equal(normaliseVenipak(venipakRow({ id: null })), null)
})

test('normaliseRows validates provider and input shape', () => {
  assert.throws(() => normaliseRows('dpd', []), /Unknown provider/)
  assert.throws(() => normaliseRows('omniva', { error: 'x' }), /expected an array/)
  assert.equal(normaliseRows('omniva', [omnivaRow(), omnivaRow({ A0_NAME: 'LT' })]).length, 1)
})

test('finalise dedupes by provider and id, sorts by provider, city, name, without mutating', () => {
  const a = { provider: 'venipak', id: '1', name: 'B', address: 'x', city: 'Rīga' }
  const b = { provider: 'omniva', id: '1', name: 'Z', address: 'x', city: 'Ādaži' }
  const c = { provider: 'omniva', id: '2', name: 'A', address: 'x', city: 'Ādaži' }
  const d = { provider: 'omniva', id: '3', name: 'A', address: 'x', city: 'Cēsis' }
  const input = [a, d, b, c, { ...c, name: 'dup' }]
  const out = finalise(input)
  assert.deepEqual(out.map((l) => `${l.provider}:${l.id}`), ['omniva:2', 'omniva:1', 'omniva:3', 'venipak:1'])
  assert.equal(input.length, 5)
  assert.equal(input[0], a)
})

test('serialise writes one object per line and valid JSON', () => {
  assert.equal(serialise([]), '[]\n')
  const text = serialise([{ a: 1 }, { b: 2 }])
  assert.equal(text, '[\n{"a":1},\n{"b":2}\n]\n')
  assert.deepEqual(JSON.parse(text), [{ a: 1 }, { b: 2 }])
})

test('countByProvider counts', () => {
  assert.deepEqual(countByProvider([{ provider: 'omniva' }, { provider: 'omniva' }, { provider: 'venipak' }]), {
    omniva: 2,
    venipak: 1,
  })
})

test('the committed snapshot is valid, Latvian, unique and sorted', () => {
  const url = new URL('../data/parcel-lockers.json', import.meta.url)
  const data = JSON.parse(readFileSync(url, 'utf8'))
  const providers = new Set(['omniva', 'dpd', 'venipak', 'latvijas-pasts', 'smartposti'])
  assert.ok(Array.isArray(data) && data.length > 0)
  for (const l of data) {
    assert.ok(providers.has(l.provider), l.provider)
    for (const k of ['id', 'name', 'address', 'city']) assert.ok(typeof l[k] === 'string' && l[k].length > 0, k)
    assert.equal('lat' in l, 'lng' in l)
    if ('lat' in l) assert.deepEqual(coords(l.lat, l.lng), { lat: l.lat, lng: l.lng })
  }
  assert.equal(new Set(data.map((l) => `${l.provider}:${l.id}`)).size, data.length)
  assert.deepEqual(finalise(data), data)
})
