import { describe, expect, it, vi } from 'vitest'
import { BOM, datedFilename, downloadCsv, escapeCell, subscribersCsv, toCsv, withBom } from './csv'

describe('escapeCell', () => {
  it.each([
    ['plain', 'plain'],
    ['Rīga, Ādaži', '"Rīga, Ādaži"'],
    ['say "hi"', '"say ""hi"""'],
    ['two\nlines', '"two\nlines"'],
    ['cr\rhere', '"cr\rhere"'],
    ['semi;colon', '"semi;colon"'],
    [' padded', '" padded"'],
    ['trailing ', '"trailing "'],
    ['=SUM(A1)', "'=SUM(A1)"],
    ['+371 2000', "'+371 2000"],
    ['-1', "'-1"],
    ['@cmd', "'@cmd"],
    ['\tx', "'\tx"],
    ['šķēle', 'šķēle'],
    ['', ''],
  ])('%j -> %j', (input, expected) => {
    expect(escapeCell(input)).toBe(expected)
  })

  it('writes numbers and booleans as they are, and nothing for null or undefined', () => {
    expect(escapeCell(-3)).toBe('-3')
    expect(escapeCell(true)).toBe('true')
    expect(escapeCell(null)).toBe('')
    expect(escapeCell(undefined)).toBe('')
  })
})

describe('toCsv', () => {
  it('joins with commas and CRLF and ends with a line break', () => {
    expect(toCsv(['a', 'b'], [['1', 'x,y'], [2, undefined]])).toBe('a,b\r\n1,"x,y"\r\n2,\r\n')
  })
  it('adds the UTF-8 BOM once', () => {
    expect(withBom('a')).toBe(`${BOM}a`)
    expect(BOM).toBe('﻿')
  })
})

describe('subscribersCsv', () => {
  it('writes one row per subscriber with charity names', () => {
    const csv = subscribersCsv(
      [
        { email: 'a@b.lv', name: 'Jānis', charityIds: ['c1', 'c2'], createdAt: '2026-11-01T00:00:00.000Z' },
        { email: 'x@y.lv', charityIds: [], createdAt: '2026-11-02T00:00:00.000Z' },
      ],
      (id) => (id === 'c1' ? 'Ulubele' : 'Cits, nams'),
      ['E-pasts', 'Vārds', 'Organizācijas', 'Datums'],
    )
    expect(csv.split('\r\n')).toEqual([
      'E-pasts,Vārds,Organizācijas,Datums',
      'a@b.lv,Jānis,"Ulubele; Cits, nams",2026-11-01T00:00:00.000Z',
      'x@y.lv,,,2026-11-02T00:00:00.000Z',
      '',
    ])
  })
})

describe('download', () => {
  it('names files by date', () => {
    expect(datedFilename('abonenti', new Date('2026-11-25T12:00:00Z'))).toBe('abonenti-2026-11-25.csv')
  })
  it('hands the browser a BOM-prefixed CSV blob and cleans up', async () => {
    const create = vi.fn((_blob: Blob) => 'blob:x')
    const revoke = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL: create, revokeObjectURL: revoke })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    downloadCsv('a.csv', 'x\r\n')
    expect(click).toHaveBeenCalled()
    expect(revoke).toHaveBeenCalledWith('blob:x')
    const blob = create.mock.calls[0]?.[0] as Blob
    expect(blob.type).toBe('text/csv;charset=utf-8')
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    expect(document.querySelector('a[download]')).toBeNull()
  })
})
