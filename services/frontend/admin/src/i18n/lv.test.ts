import { describe, expect, it } from 'vitest'
import { fmt, lv } from './lv'

const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : typeof value === 'object' && value !== null ? Object.values(value).flatMap(strings) : []

describe('lv messages', () => {
  it('has no em dash anywhere', () => {
    const offenders = strings(lv).filter((s) => s.includes('\u2014'))
    expect(offenders).toEqual([])
  })
  it('has no empty string', () => {
    expect(strings(lv).filter((s) => s.trim() === '')).toEqual([])
  })
  it('fills placeholders and leaves unknown ones', () => {
    expect(fmt('{a} un {b}', { a: 1 })).toBe('1 un {b}')
  })
})
