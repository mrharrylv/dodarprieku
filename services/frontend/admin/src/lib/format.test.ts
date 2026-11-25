import { describe, expect, it } from 'vitest'
import { categoryLabel, formatDate, formatDateTime, formatNumber, legalFormLabel, mediaUrl, providerLabel, publicCharityUrl, statusLabel } from './format'

describe('format', () => {
  it('formats dates in Latvian and keeps unparseable input', () => {
    expect(formatDate('2026-11-05T10:00:00Z')).toMatch(/05\.11\.2026/)
    expect(formatDateTime('2026-11-05T10:00:00Z')).toMatch(/05\.11\.2026/)
    expect(formatDate('bad')).toBe('bad')
    expect(formatDateTime('bad')).toBe('bad')
  })
  it('formats numbers with Latvian grouping', () => {
    expect(formatNumber(12345).replace(/\s/g, ' ')).toBe('12 345')
  })
  it('labels catalog ids and falls back to the id', () => {
    expect(categoryLabel('dzivnieku-patversme')).toBe('Dzīvnieku patversme')
    expect(categoryLabel('nav')).toBe('nav')
    expect(legalFormLabel('biedriba')).toBe('Biedrība')
    expect(legalFormLabel('x')).toBe('x')
    expect(providerLabel('omniva')).toBe('Omniva')
    expect(providerLabel('x')).toBe('x')
    expect(statusLabel('suspended')).toBe('Apturēta')
  })
  it('builds media and public page URLs', () => {
    expect(mediaUrl('uploads/a.webp')).toBe('/media/uploads/a.webp')
    expect(publicCharityUrl('ulubele', 'admin.dodarprieku.hagroup.lv')).toBe(`${window.location.protocol}//dodarprieku.hagroup.lv/organizacija/ulubele`)
    expect(publicCharityUrl('a b', 'localhost:5174')).toBe(`${window.location.protocol}//localhost:5174/organizacija/a%20b`)
  })
})
