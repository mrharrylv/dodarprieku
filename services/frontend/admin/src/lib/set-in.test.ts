import { describe, expect, it } from 'vitest'
import { setIn } from './set-in'

describe('setIn', () => {
  it('sets a nested value, copying only the changed branch', () => {
    const root = Object.freeze({ a: Object.freeze({ b: 1, c: 2 }), d: Object.freeze({ e: 3 }) })
    const next = setIn(root, 'a.b', 9)
    expect(next).toEqual({ a: { b: 9, c: 2 }, d: { e: 3 } })
    expect(next.d).toBe(root.d)
    expect(root.a.b).toBe(1)
  })
  it('removes a key when the value is undefined', () => {
    expect(setIn({ a: { b: 1, c: 2 } }, 'a.b', undefined)).toEqual({ a: { c: 2 } })
  })
  it('creates missing objects and arrays on the way', () => {
    expect(setIn({}, 'a.b', 1)).toEqual({ a: { b: 1 } })
    expect(setIn({}, 'list.0.name', 'x')).toEqual({ list: [{ name: 'x' }] })
  })
  it('updates, appends and removes array items by index', () => {
    const root = Object.freeze({ list: Object.freeze([1, 2, 3]) })
    expect(setIn(root, 'list.1', 9)).toEqual({ list: [1, 9, 3] })
    expect(setIn(root, 'list.3', 4)).toEqual({ list: [1, 2, 3, 4] })
    expect(setIn(root, 'list.0', undefined)).toEqual({ list: [2, 3] })
    expect(setIn({ list: [{ a: 1 }] }, 'list.0.a', 2)).toEqual({ list: [{ a: 2 }] })
  })
  it('returns the root for an empty path', () => {
    const root = { a: 1 }
    expect(setIn(root, '', 2)).toBe(root)
  })
})
