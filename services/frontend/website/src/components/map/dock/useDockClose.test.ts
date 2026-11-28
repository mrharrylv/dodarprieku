import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Dock } from '@/lib/map-route'
import { DOCK_MOTION_MS } from './dock-motion'
import { useDockClose } from './useDockClose'

const REGISTER: Dock = { kind: 'register' }
const ACCOUNT: Dock = { kind: 'account', view: 'main' }

const reducedMotion = (reduce: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('reduce'), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))

describe('useDockClose', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('slides the dock out first and leaves its address once the slide is over', () => {
    reducedMotion(false)
    const finish = vi.fn()
    const { result } = renderHook(({ dock }) => useDockClose(dock, finish), { initialProps: { dock: REGISTER as Dock | null } })
    expect(result.current.closing).toBe(false)
    act(() => result.current.close())
    expect(result.current.closing).toBe(true)
    expect(finish).not.toHaveBeenCalled()
    // A second press while it slides does not queue a second finish.
    act(() => result.current.close())
    act(() => vi.advanceTimersByTime(DOCK_MOTION_MS))
    expect(finish).toHaveBeenCalledTimes(1)
  })

  it('stays closing until its address has actually gone, so the dock never slides back in for a few frames', () => {
    reducedMotion(false)
    const finish = vi.fn()
    const { result, rerender } = renderHook(({ dock }) => useDockClose(dock, finish), { initialProps: { dock: REGISTER as Dock | null } })
    act(() => result.current.close())
    act(() => vi.advanceTimersByTime(DOCK_MOTION_MS))
    expect(finish).toHaveBeenCalledTimes(1)
    // The router commits the new address later than the timer: until then the dock is still the register one.
    expect(result.current.closing).toBe(true)
    // A press meanwhile does not start a second slide or a second finish.
    act(() => result.current.close())
    act(() => vi.advanceTimersByTime(DOCK_MOTION_MS))
    expect(finish).toHaveBeenCalledTimes(1)
    rerender({ dock: null })
    expect(result.current.closing).toBe(false)
  })

  it('does not leave for home when the visitor went somewhere else while it slid out', () => {
    reducedMotion(false)
    const finish = vi.fn()
    const before = window.location.pathname
    const { result } = renderHook(() => useDockClose(REGISTER, finish))
    act(() => result.current.close())
    // "Mans konts" pressed mid-slide: the browser's address moves at once, the router's state only later.
    window.history.pushState({ key: 'konts' }, '', '/konts')
    try {
      act(() => vi.advanceTimersByTime(DOCK_MOTION_MS))
      expect(finish).not.toHaveBeenCalled()
    } finally {
      window.history.replaceState(null, '', before)
    }
  })

  it('finishes at once for someone who asked for reduced motion', () => {
    reducedMotion(true)
    const finish = vi.fn()
    const { result } = renderHook(() => useDockClose(REGISTER, finish))
    act(() => result.current.close())
    expect(finish).toHaveBeenCalledTimes(1)
    expect(result.current.closing).toBe(false)
  })

  it('cancels the pending finish when another dock opens while it slides out', () => {
    reducedMotion(false)
    const finish = vi.fn()
    const { result, rerender } = renderHook(({ dock }) => useDockClose(dock, finish), { initialProps: { dock: REGISTER as Dock | null } })
    act(() => result.current.close())
    rerender({ dock: ACCOUNT })
    expect(result.current.closing).toBe(false)
    act(() => vi.advanceTimersByTime(DOCK_MOTION_MS * 2))
    expect(finish).not.toHaveBeenCalled()
    // Back on the first dock later, it is open, not still closing.
    rerender({ dock: REGISTER })
    expect(result.current.closing).toBe(false)
  })

  it('does nothing with no dock open', () => {
    reducedMotion(false)
    const finish = vi.fn()
    const { result } = renderHook(() => useDockClose(null, finish))
    act(() => result.current.close())
    act(() => vi.advanceTimersByTime(DOCK_MOTION_MS))
    expect(finish).not.toHaveBeenCalled()
  })
})
