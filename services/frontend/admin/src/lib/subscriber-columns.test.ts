import { describe, expect, it } from 'vitest'
import type { SubscriberRecord } from '@shared/contracts'
import { allColumns, charityColumns, columnsCsv, generalColumns, organisationIds } from './subscriber-columns'

const rows: SubscriberRecord[] = [
  { email: 'a@b.lv', name: 'Jānis', charityIds: ['c2', 'c1'], general: true, createdAt: '2026-11-01T00:00:00.000Z' },
  { email: 'x@y.lv', charityIds: [], general: true, createdAt: '2026-11-02T00:00:00.000Z' },
  { email: 'o@y.lv', charityIds: ['c2'], general: false, createdAt: '2026-11-03T00:00:00.000Z' },
]
const name = (id: string) => ({ c1: 'Ābeles nams', c2: 'Bērnu nams' })[id] ?? id

describe('subscriber columns', () => {
  it('orders organisation columns by name, the Latvian way', () => {
    expect(organisationIds(rows, name)).toEqual(['c1', 'c2'])
    expect(organisationIds([], name)).toEqual([])
  })

  it('shows "Vispārīgi" on screen for a subscriber of no organisation, and names them in the CSV', () => {
    const cols = generalColumns(name)
    expect(cols.find((c) => c.key === 'charities')!.cell(rows[1]!)).toBe('Vispārīgi')
    expect(columnsCsv(cols, [rows[0]!])).toBe('E-pasts,Vārds,Organizācijas,Pieteicās\r\na@b.lv,Jānis,"Bērnu nams; Ābeles nams",2026-11-01T00:00:00.000Z\r\n')
  })

  it('gives everyone a general column and one per organisation', () => {
    expect(columnsCsv(allColumns(rows, name), rows)).toBe(
      'E-pasts,Vārds,Vispārējie jaunumi,Pieteicās,Ābeles nams,Bērnu nams\r\n' +
        'a@b.lv,Jānis,Jā,2026-11-01T00:00:00.000Z,Jā,Jā\r\n' +
        'x@y.lv,,Jā,2026-11-02T00:00:00.000Z,,\r\n' +
        'o@y.lv,,,2026-11-03T00:00:00.000Z,,Jā\r\n',
    )
  })

  it('formats the date on screen and keeps the timestamp in the CSV', () => {
    const created = charityColumns.find((c) => c.key === 'createdAt')!
    expect(created.cell(rows[0]!)).not.toBe(rows[0]!.createdAt)
    expect(created.csv!(rows[0]!)).toBe(rows[0]!.createdAt)
  })
})
