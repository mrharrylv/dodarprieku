import { describe, it, expect } from 'vitest'

import { cn } from './cn'

describe('cn', () => {
  it('joins class names with a single space', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c')
  })

  it('drops every falsy value', () => {
    // The point of the helper: `cond && 'class'` is the idiom used throughout
    // the components, and `false` must not reach the DOM as a class name.
    expect(cn('a', false, 'b', null, undefined, 'c')).toBe('a b c')
  })

  it('drops the empty string', () => {
    expect(cn('', 'a', '')).toBe('a')
  })

  it('returns an empty string when nothing survives', () => {
    // Callers pass the result straight to `className`, so it must be a string.
    expect(cn(false, null, undefined)).toBe('')
    expect(cn()).toBe('')
  })

  it('keeps 0 out, since it is falsy and never a class name', () => {
    expect(cn(0, 'a')).toBe('a')
  })

  it('keeps a non-zero number, which template literals can produce', () => {
    expect(cn(1, 'a')).toBe('1 a')
  })

  it('does not deduplicate or resolve conflicts, by design', () => {
    // Documented behaviour rather than an oversight: the components compose
    // classes instead of overriding them, so tailwind-merge would be 8 KB
    // spent on a problem this codebase does not have.
    expect(cn('p-2', 'p-4')).toBe('p-2 p-4')
  })
})
