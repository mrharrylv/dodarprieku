import { describe, expect, it, vi } from 'vitest'

import type { PageContext, TrackPayload } from './analytics'
import { createTracker, randomId } from './tracker'

const context = (path: string): PageContext => ({
  site: 'a.hagroup.lv',
  path,
  referrer: 'https://www.google.com/',
  search: '?ref=mail',
  viewportWidth: 1280,
  viewportHeight: 800,
  language: 'lv',
  timeZone: 'Europe/Riga',
})

const setup = (visible = true) => {
  const sent: TrackPayload[] = []
  let clock = 1_000
  let n = 0
  let shown = visible
  const tracker = createTracker({
    send: (p) => sent.push(p),
    now: () => clock,
    newId: () => `id${(n += 1)}`,
    context,
    visible: () => shown,
  })
  return {
    tracker,
    sent,
    advance: (ms: number) => {
      clock += ms
    },
    setShown: (v: boolean) => {
      shown = v
    },
  }
}

describe('createTracker', () => {
  it('reports a page view with one visit id and a fresh page-view id', () => {
    const { tracker, sent } = setup()
    tracker.pageview('/lv')
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({ type: 'pageview', sid: 'id1', pid: 'id2', seq: 1, path: '/lv' })
  })

  it('counts the same path twice in a row as one page view (StrictMode, a re-render)', () => {
    const { tracker, sent } = setup()
    tracker.pageview('/lv')
    tracker.pageview('/lv')
    expect(sent).toHaveLength(1)
  })

  it('closes the open page view with its time when the visitor moves on', () => {
    const { tracker, sent, advance } = setup()
    tracker.pageview('/lv')
    tracker.scrolled(40)
    tracker.scrolled(25)
    advance(30_000)
    tracker.pageview('/lv/about')
    expect(sent.map((p) => p.type)).toEqual(['pageview', 'engagement', 'pageview'])
    expect(sent[1]).toMatchObject({ pid: 'id2', path: '/lv', engaged_ms: 30_000, scroll_pct: 40, final: true })
    expect(sent[2]).toMatchObject({ sid: 'id1', pid: 'id3', seq: 2, ref: '', campaign: {} })
  })

  it('reports the running total each time the tab is hidden, and does not count hidden time', () => {
    const { tracker, sent, advance } = setup()
    tracker.pageview('/lv')
    advance(10_000)
    tracker.visibility(false)
    advance(600_000)
    tracker.visibility(true)
    advance(5_000)
    tracker.visibility(false)
    const engaged = sent.filter((p) => p.type === 'engagement')
    expect(engaged.map((p) => p.type === 'engagement' && p.engaged_ms)).toEqual([10_000, 15_000])
    expect(engaged.every((p) => p.type === 'engagement' && !p.final)).toBe(true)
  })

  it('sends nothing new when hidden twice or when no time has passed', () => {
    const { tracker, sent, advance } = setup()
    tracker.pageview('/lv')
    tracker.visibility(false)
    advance(1_000)
    tracker.visibility(false)
    tracker.pageview('/lv/about')
    expect(sent.map((p) => p.type)).toEqual(['pageview', 'pageview'])
  })

  it('starts counting a page opened in a background tab only once it is shown', () => {
    const { tracker, sent, advance, setShown } = setup(false)
    tracker.pageview('/lv')
    advance(60_000)
    setShown(true)
    tracker.visibility(true)
    tracker.visibility(true)
    advance(2_000)
    tracker.visibility(false)
    expect(sent[1]).toMatchObject({ type: 'engagement', engaged_ms: 2_000 })
  })

  it('ignores a hidden tab and scrolling before any page view', () => {
    const { tracker, sent } = setup()
    tracker.visibility(false)
    tracker.scrolled(50)
    expect(sent).toEqual([])
  })

  it('caps scroll depth at 100 and ignores a non-number', () => {
    const { tracker, sent, advance } = setup()
    tracker.pageview('/lv')
    tracker.scrolled(Number.NaN)
    tracker.scrolled(250)
    advance(1)
    tracker.visibility(false)
    expect(sent[1]).toMatchObject({ scroll_pct: 100 })
  })
})

describe('randomId', () => {
  it('is 32 hex characters and different each time', () => {
    const a = randomId()
    expect(a).toMatch(/^[0-9a-f]{32}$/)
    expect(randomId()).not.toBe(a)
  })

  it('still works without crypto.getRandomValues', () => {
    vi.stubGlobal('crypto', undefined)
    expect(randomId()).toMatch(/^[0-9a-f]{32}$/)
  })
})
