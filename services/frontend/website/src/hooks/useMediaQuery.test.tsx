import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useMediaQuery } from './useMediaQuery'

const fakeMedia = (initial: boolean) => {
  const listeners = new Set<() => void>()
  const list = {
    matches: initial,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
  }
  vi.stubGlobal('matchMedia', () => list)
  return {
    listeners,
    set: (next: boolean) => {
      list.matches = next
      for (const cb of listeners) cb()
    },
  }
}

describe('useMediaQuery', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('follows the query as the viewport changes, and stops listening on unmount', () => {
    const media = fakeMedia(false)
    const { result, unmount } = renderHook(() => useMediaQuery('(max-width: 47.99rem)'))
    expect(result.current).toBe(false)
    act(() => media.set(true))
    expect(result.current).toBe(true)
    unmount()
    expect(media.listeners.size).toBe(0)
  })

  it('is false where matchMedia is missing', () => {
    vi.stubGlobal('matchMedia', undefined)
    const { result } = renderHook(() => useMediaQuery('(max-width: 47.99rem)'))
    expect(result.current).toBe(false)
  })
})
