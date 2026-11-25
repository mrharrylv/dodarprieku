import { describe, expect, it } from 'vitest'

import { ANALYTICS } from '@/config/constants'
import {
  campaignFrom,
  clip,
  deviceClass,
  engagementPayload,
  externalReferrer,
  pageviewPayload,
  scrollPercent,
  trackingAllowed,
  type PageContext,
  type TrackingConditions,
} from './analytics'

const ctx = (over: Partial<PageContext> = {}): PageContext => ({
  site: 'westamarine.hagroup.lv',
  path: '/lv/services',
  referrer: 'https://mail.google.com/mail/u/0/#inbox/FMfcgz',
  search: '?ref=offer-email&utm_source=gmail&email=someone@example.com',
  viewportWidth: 390,
  viewportHeight: 844,
  language: 'lv-LV',
  timeZone: 'Europe/Riga',
  ...over,
})

const ids = { sid: 's1', pid: 'p1' }

describe('deviceClass', () => {
  it('cuts at the Tailwind md and lg breakpoints', () => {
    expect(deviceClass(0)).toBe('mobile')
    expect(deviceClass(767)).toBe('mobile')
    expect(deviceClass(768)).toBe('tablet')
    expect(deviceClass(1023)).toBe('tablet')
    expect(deviceClass(1024)).toBe('desktop')
    expect(deviceClass(2560)).toBe('desktop')
  })
})

describe('clip', () => {
  it('trims, cuts to length and turns a non-string into empty', () => {
    expect(clip('  abc  ', 2)).toBe('ab')
    expect(clip(null, 5)).toBe('')
    expect(clip(42, 5)).toBe('')
  })
})

describe('externalReferrer', () => {
  it('keeps only the origin of another site', () => {
    expect(externalReferrer('https://mail.google.com/mail/u/0/#inbox/x?q=secret', 'a.lv')).toBe(
      'https://mail.google.com',
    )
    expect(externalReferrer('http://old.example.com/page', 'a.lv')).toBe('http://old.example.com')
  })

  it('says nothing for the same host, no referrer, a non-web scheme or garbage', () => {
    expect(externalReferrer('https://a.lv/lv/about', 'a.lv')).toBe('')
    expect(externalReferrer('', 'a.lv')).toBe('')
    expect(externalReferrer('android-app://com.google.android.gm/', 'a.lv')).toBe('')
    expect(externalReferrer('not a url', 'a.lv')).toBe('')
  })
})

describe('campaignFrom', () => {
  it('keeps only the campaign parameters, never anything else in the query', () => {
    expect(campaignFrom('?ref=offer-email&utm_source=gmail&email=someone@example.com&token=abc')).toEqual({
      ref: 'offer-email',
      utm_source: 'gmail',
    })
  })

  it('drops empty values and cuts long ones', () => {
    const long = 'x'.repeat(ANALYTICS.maxCampaign + 50)
    expect(campaignFrom(`?utm_medium=&utm_campaign=${long}`)).toEqual({
      utm_campaign: 'x'.repeat(ANALYTICS.maxCampaign),
    })
    expect(campaignFrom('')).toEqual({})
  })
})

describe('scrollPercent', () => {
  it('is how much of the page has been on screen', () => {
    expect(scrollPercent(0, 800, 4000)).toBe(20)
    expect(scrollPercent(1200, 800, 4000)).toBe(50)
    expect(scrollPercent(3200, 800, 4000)).toBe(100)
    expect(scrollPercent(9999, 800, 4000)).toBe(100)
  })

  it('is 100 for a page shorter than the screen and 0 when there is no layout', () => {
    expect(scrollPercent(0, 800, 600)).toBe(100)
    expect(scrollPercent(0, 0, 0)).toBe(0)
    expect(scrollPercent(0, 800, Number.NaN)).toBe(0)
  })
})

describe('trackingAllowed', () => {
  const base: TrackingConditions = {
    production: true,
    hostname: 'westamarine.hagroup.lv',
    webdriver: false,
    globalPrivacyControl: false,
    doNotTrack: null,
  }

  it('reports a real visit to a production build', () => {
    expect(trackingAllowed(base)).toBe(true)
    expect(trackingAllowed({ ...base, doNotTrack: '0' })).toBe(true)
  })

  it('never reports from development or an automated browser', () => {
    expect(trackingAllowed({ ...base, production: false })).toBe(false)
    expect(trackingAllowed({ ...base, webdriver: true })).toBe(false)
  })

  it.each(['localhost', '127.0.0.1', '[::1]', '0.0.0.0', 'mac.local', 'site.localhost', ''])(
    'never reports from %j',
    (hostname) => {
      expect(trackingAllowed({ ...base, hostname })).toBe(false)
    },
  )

  it('respects Global Privacy Control and Do Not Track', () => {
    expect(trackingAllowed({ ...base, globalPrivacyControl: true })).toBe(false)
    expect(trackingAllowed({ ...base, doNotTrack: '1' })).toBe(false)
    expect(trackingAllowed({ ...base, doNotTrack: 'yes' })).toBe(false)
  })
})

describe('pageviewPayload', () => {
  it('describes the landing page with its source and campaign, and no personal data', () => {
    const payload = pageviewPayload(ids, 1, ctx(), 1_700_000_000_000)
    expect(payload).toEqual({
      v: 1,
      type: 'pageview',
      site: 'westamarine.hagroup.lv',
      sid: 's1',
      pid: 'p1',
      seq: 1,
      path: '/lv/services',
      ref: 'https://mail.google.com',
      campaign: { ref: 'offer-email', utm_source: 'gmail' },
      device: 'mobile',
      vw: 390,
      vh: 844,
      lang: 'lv-LV',
      tz: 'Europe/Riga',
      ts: 1_700_000_000_000,
    })
    expect(JSON.stringify(payload)).not.toContain('someone@example.com')
  })

  it('leaves the source and campaign off every later page of the visit', () => {
    const payload = pageviewPayload(ids, 2, ctx(), 1)
    expect(payload.ref).toBe('')
    expect(payload.campaign).toEqual({})
  })

  it('cuts oversized fields and keeps numbers whole and non-negative', () => {
    const payload = pageviewPayload(
      ids,
      1,
      ctx({ path: `/${'a'.repeat(1000)}`, viewportWidth: -5, viewportHeight: 844.6, timeZone: 'x'.repeat(100) }),
      1,
    )
    expect(payload.path).toHaveLength(ANALYTICS.maxPath)
    expect(payload.vw).toBe(0)
    expect(payload.vh).toBe(845)
    expect(payload.tz).toHaveLength(ANALYTICS.maxTimeZone)
  })

  it('reports an empty path as the root', () => {
    expect(pageviewPayload(ids, 1, ctx({ path: '' }), 1).path).toBe('/')
  })
})

describe('engagementPayload', () => {
  it('carries the running time and scroll depth of one page view', () => {
    expect(
      engagementPayload(ids, { site: 'a.lv', path: '/lv', engagedMs: 12_345.4, scrollPct: 80, final: true }, 5),
    ).toEqual({
      v: 1,
      type: 'engagement',
      site: 'a.lv',
      sid: 's1',
      pid: 'p1',
      path: '/lv',
      engaged_ms: 12_345,
      scroll_pct: 80,
      final: true,
      ts: 5,
    })
  })

  it('caps the time at six hours and the scroll at 100, and floors both at 0', () => {
    const over = engagementPayload(ids, { site: 'a.lv', path: '', engagedMs: 1e12, scrollPct: 400, final: false }, 1)
    expect(over.engaged_ms).toBe(ANALYTICS.maxEngagedMs)
    expect(over.scroll_pct).toBe(100)
    expect(over.path).toBe('/')
    const under = engagementPayload(ids, { site: 'a.lv', path: '/', engagedMs: -1, scrollPct: Number.NaN, final: false }, 1)
    expect(under.engaged_ms).toBe(0)
    expect(under.scroll_pct).toBe(0)
  })
})
