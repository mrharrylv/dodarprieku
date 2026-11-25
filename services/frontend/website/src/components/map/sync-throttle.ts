/**
 * Paces the marker sync. MapLibre fires `move` on every frame of a pan or
 * ease; working out the markers (querying both sources, filtering, signing)
 * that often costs frames with a thousand charities. So a request runs at
 * most once per animation frame, at most every `intervalMs` while the camera
 * moves, and an urgent one (the move ended, new tiles arrived) on the next
 * frame. The trailing request is never lost, so the view always ends right.
 */
export interface SyncThrottle {
  readonly request: (urgent?: boolean) => void
  readonly cancel: () => void
}

export interface ThrottleClock {
  readonly now: () => number
  readonly frame: (cb: () => void) => number
  readonly cancelFrame: (id: number) => void
  readonly later: (cb: () => void, ms: number) => number
  readonly cancelLater: (id: number) => void
}

const browserClock: ThrottleClock = {
  now: () => performance.now(),
  frame: (cb) => requestAnimationFrame(cb),
  cancelFrame: (id) => cancelAnimationFrame(id),
  later: (cb, ms) => window.setTimeout(cb, ms),
  cancelLater: (id) => window.clearTimeout(id),
}

export const createSyncThrottle = (work: () => void, intervalMs: number, clock: ThrottleClock = browserClock): SyncThrottle => {
  let frame = 0
  let timer = 0
  let last = Number.NEGATIVE_INFINITY

  const fire = () => {
    frame = 0
    last = clock.now()
    work()
  }

  const request = (urgent = false) => {
    if (frame !== 0) return
    const wait = urgent ? 0 : last + intervalMs - clock.now()
    if (wait <= 0) {
      if (timer !== 0) clock.cancelLater(timer)
      timer = 0
      frame = clock.frame(fire)
      return
    }
    if (timer === 0) {
      timer = clock.later(() => {
        timer = 0
        request(true)
      }, wait)
    }
  }

  const cancel = () => {
    if (frame !== 0) clock.cancelFrame(frame)
    if (timer !== 0) clock.cancelLater(timer)
    frame = 0
    timer = 0
  }

  return { request, cancel }
}
