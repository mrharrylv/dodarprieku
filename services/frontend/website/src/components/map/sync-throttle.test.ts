import { describe, expect, it, vi } from 'vitest'

import { createSyncThrottle, type ThrottleClock } from './sync-throttle'

/** A hand-driven clock: frames and timers run only when the test says so. */
const manualClock = () => {
  let now = 0
  let id = 0
  const frames = new Map<number, () => void>()
  const timers = new Map<number, { at: number; cb: () => void }>()
  const clock: ThrottleClock = {
    now: () => now,
    frame: (cb) => (frames.set(++id, cb), id),
    cancelFrame: (n) => void frames.delete(n),
    later: (cb, ms) => (timers.set(++id, { at: now + ms, cb }), id),
    cancelLater: (n) => void timers.delete(n),
  }
  const runFrames = () => {
    const due = [...frames.values()]
    frames.clear()
    for (const cb of due) cb()
  }
  const advance = (ms: number) => {
    now += ms
    for (const [n, t] of [...timers]) {
      if (t.at <= now) {
        timers.delete(n)
        t.cb()
      }
    }
  }
  return { clock, runFrames, advance, frames, timers }
}

describe('createSyncThrottle', () => {
  it('runs once per frame however often it is asked', () => {
    const m = manualClock()
    const work = vi.fn()
    const throttle = createSyncThrottle(work, 100, m.clock)
    throttle.request()
    throttle.request()
    throttle.request(true)
    m.runFrames()
    expect(work).toHaveBeenCalledTimes(1)
  })

  it('waits out the interval while moving, then runs the trailing request', () => {
    const m = manualClock()
    const work = vi.fn()
    const throttle = createSyncThrottle(work, 100, m.clock)
    throttle.request()
    m.runFrames()
    m.advance(16)
    throttle.request()
    m.runFrames()
    expect(work).toHaveBeenCalledTimes(1)
    m.advance(90)
    m.runFrames()
    expect(work).toHaveBeenCalledTimes(2)
  })

  it('runs an urgent request on the next frame, dropping the pending timer', () => {
    const m = manualClock()
    const work = vi.fn()
    const throttle = createSyncThrottle(work, 100, m.clock)
    throttle.request()
    m.runFrames()
    throttle.request()
    expect(m.timers.size).toBe(1)
    throttle.request(true)
    expect(m.timers.size).toBe(0)
    m.runFrames()
    expect(work).toHaveBeenCalledTimes(2)
  })

  it('cancels whatever is pending', () => {
    const m = manualClock()
    const work = vi.fn()
    const throttle = createSyncThrottle(work, 100, m.clock)
    throttle.request()
    throttle.cancel()
    m.runFrames()
    throttle.request()
    m.runFrames()
    m.advance(5)
    throttle.request()
    throttle.cancel()
    m.advance(200)
    m.runFrames()
    expect(work).toHaveBeenCalledTimes(1)
  })
})
