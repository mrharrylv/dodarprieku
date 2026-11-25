import { describe, it, expect } from 'vitest'

import { UnknownStyleError, resolveActiveStyle, transformIndexCss } from './build'

const available = ['bento', 'classic', 'editorial'] as const

describe('resolveActiveStyle', () => {
  it('takes the committed choice', () => {
    expect(resolveActiveStyle({ fromFile: 'classic', available })).toBe('classic')
  })

  it('lets the environment override it, for previewing without a commit', () => {
    expect(resolveActiveStyle({ fromEnv: 'bento', fromFile: 'classic', available })).toBe('bento')
  })

  it('ignores an empty or whitespace override rather than treating it as a choice', () => {
    expect(resolveActiveStyle({ fromEnv: '   ', fromFile: 'classic', available })).toBe('classic')
  })

  it.each([
    ['an unknown id', 'nosuch'],
    ['nothing at all', ''],
    ['a path traversal', '../secrets'],
    ['an uppercase id', 'Classic'],
  ])('throws for %s, naming the styles that do exist', (_case, id) => {
    // The error a person sees after deleting the active style's folder. It has
    // to say what to do next.
    expect(() => resolveActiveStyle({ fromFile: id, available })).toThrow(UnknownStyleError)
    expect(() => resolveActiveStyle({ fromFile: id, available })).toThrow(
      /Available: bento, classic, editorial/,
    )
  })
})

describe('transformIndexCss', () => {
  const source = `@import 'tailwindcss';\n/* @active-style:tokens */\n/* @active-style:source */\n`
  const out = transformIndexCss(source, { id: 'classic', available })

  it('imports the active style tokens into the components layer', () => {
    // The components layer is what lets a style beat the base semantic tokens.
    expect(out).toContain("@import './styles/classic/tokens.css' layer(components);")
  })

  it('excludes every OTHER style from the Tailwind scan', () => {
    expect(out).toContain('@source not "./styles/bento";')
    expect(out).toContain('@source not "./styles/editorial";')
  })

  it('never excludes the active style, nor the whole folder', () => {
    // The bug this pins: `@source not "./styles/**"` plus a re-include beats
    // the re-include, strips the active style's classes, and ships a site with
    // no layout while every jsdom test still passes.
    expect(out).not.toContain('@source not "./styles/classic"')
    expect(out).not.toContain('./styles/**')
  })

  it('leaves no marker behind', () => {
    expect(out).not.toContain('@active-style:')
  })

  it('emits nothing to exclude when there is only one style', () => {
    const single = transformIndexCss(source, { id: 'classic', available: ['classic'] })
    expect(single).not.toContain('@source not')
    expect(single).toContain("@import './styles/classic/tokens.css'")
  })
})
