import { describe, expect, it } from 'vitest'

import { isTextEntry } from './keyboard'

const input = (type: string) => Object.assign(document.createElement('input'), { type })

describe('isTextEntry', () => {
  it('is true where the visitor types', () => {
    expect(isTextEntry(input('text'))).toBe(true)
    expect(isTextEntry(input('search'))).toBe(true)
    expect(isTextEntry(input('email'))).toBe(true)
    expect(isTextEntry(document.createElement('textarea'))).toBe(true)
    expect(isTextEntry(document.createElement('select'))).toBe(true)
    const editable = document.createElement('div')
    editable.contentEditable = 'true'
    Object.defineProperty(editable, 'isContentEditable', { value: true })
    expect(isTextEntry(editable)).toBe(true)
  })

  it('is false for buttons, ticks and anything that is not an element', () => {
    expect(isTextEntry(input('checkbox'))).toBe(false)
    expect(isTextEntry(input('radio'))).toBe(false)
    expect(isTextEntry(document.createElement('button'))).toBe(false)
    expect(isTextEntry(document.createElement('section'))).toBe(false)
    expect(isTextEntry(null)).toBe(false)
    expect(isTextEntry(window)).toBe(false)
  })
})
