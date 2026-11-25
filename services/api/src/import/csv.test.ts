import { describe, expect, it } from 'vitest'
import { parseCsv, toRecords } from './csv'

describe('parseCsv', () => {
  it('reads plain fields, a BOM, CRLF and a trailing line break', () => {
    expect(parseCsv('\uFEFFa,b\r\n1,2\r\n')).toEqual([['a', 'b'], ['1', '2']])
    expect(parseCsv('a,b\n1,2')).toEqual([['a', 'b'], ['1', '2']])
    expect(parseCsv('a\r1')).toEqual([['a'], ['1']])
    expect(parseCsv('')).toEqual([])
  })

  it('reads quoted fields with commas, doubled quotes and line breaks', () => {
    const text = 'name,address\n"Biedrības ""Latvijas Sarkanais Krusts"" komiteja","Iela 1,\nRīga"\n'
    expect(parseCsv(text)).toEqual([
      ['name', 'address'],
      ['Biedrības "Latvijas Sarkanais Krusts" komiteja', 'Iela 1,\nRīga'],
    ])
  })

  it('keeps empty fields, including a last empty one', () => {
    expect(parseCsv('a,,c,\n')).toEqual([['a', '', 'c', '']])
    expect(parseCsv('"",x')).toEqual([['', 'x']])
  })

  it('treats a quote inside an unquoted field as text, and fails on an unterminated one', () => {
    expect(parseCsv('a"b,c')).toEqual([['a"b', 'c']])
    expect(() => parseCsv('"open,field')).toThrow(/unterminated/)
  })
})

describe('toRecords', () => {
  it('keys rows by the header, fills short rows and skips blank lines', () => {
    expect(toRecords([['a', ' b '], ['1'], [''], ['3', '4']])).toEqual([{ a: '1', b: '' }, { a: '3', b: '4' }])
    expect(toRecords([])).toEqual([])
  })
})
