import { describe, it, expect, vi } from 'vitest'

import { hasGoogleAnalytics, parseGaMeasurementId } from './env'

describe('parseGaMeasurementId', () => {
  it('accepts a GA4 id, trimmed', () => {
    expect(parseGaMeasurementId('G-ABC123XYZ')).toBe('G-ABC123XYZ')
    expect(parseGaMeasurementId('  G-ABCD1234 ')).toBe('G-ABCD1234')
  })

  it('treats nothing as off, quietly', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(parseGaMeasurementId(undefined)).toBeNull()
    expect(parseGaMeasurementId('')).toBeNull()
    expect(parseGaMeasurementId('   ')).toBeNull()
    expect(error).not.toHaveBeenCalled()
  })

  it.each(['UA-12345-1', 'g-abc123', 'G-', 'G-abc 123', 'G-<script>'])('refuses %s, and says so', (raw) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(parseGaMeasurementId(raw)).toBeNull()
    expect(error).toHaveBeenCalledOnce()
  })
})

describe('hasGoogleAnalytics', () => {
  it('is true only on a production build with an id', () => {
    expect(hasGoogleAnalytics({ isProd: true, gaMeasurementId: 'G-ABCD1234' })).toBe(true)
    expect(hasGoogleAnalytics({ isProd: false, gaMeasurementId: 'G-ABCD1234' })).toBe(false)
    expect(hasGoogleAnalytics({ isProd: true, gaMeasurementId: null })).toBe(false)
  })

  it('is false in the test build, which sets no id', () => {
    expect(hasGoogleAnalytics()).toBe(false)
  })
})
