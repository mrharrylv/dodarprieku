import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SIGNED_IN_HINT, resetSignedIn, setSignedIn, useSignedIn } from './useSignedIn'

const me = (status: number) => {
  const fetcher = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(status === 200 ? { ok: true, data: { email: 'a@b.lv', role: 'charity' } } : { ok: false, error: 'unauthorized' }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}

describe('useSignedIn', () => {
  afterEach(() => resetSignedIn())

  it('is unknown before hydration and asks nothing', () => {
    const fetcher = me(200)
    window.localStorage.setItem(SIGNED_IN_HINT, '1')
    const { result } = renderHook(() => useSignedIn(false))
    expect(result.current).toBeNull()
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('answers an anonymous visitor at once, without a request that would end in 401', async () => {
    const fetcher = me(401)
    const { result } = renderHook(() => useSignedIn(true))
    await waitFor(() => expect(result.current).toBe(false))
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('trusts the hint from the first paint, confirms it once, and follows logins and logouts', async () => {
    const fetcher = me(200)
    window.localStorage.setItem(SIGNED_IN_HINT, '1')
    const { result } = renderHook(() => useSignedIn(true))
    expect(result.current).toBe(true)
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    expect(result.current).toBe(true)
    act(() => setSignedIn(false))
    expect(result.current).toBe(false)
    expect(window.localStorage.getItem(SIGNED_IN_HINT)).toBeNull()
    renderHook(() => useSignedIn(true))
    expect(fetcher).toHaveBeenCalledTimes(1)
    act(() => setSignedIn(true))
    expect(window.localStorage.getItem(SIGNED_IN_HINT)).toBe('1')
  })

  it('drops a stale hint when the session has expired', async () => {
    me(401)
    window.localStorage.setItem(SIGNED_IN_HINT, '1')
    const { result } = renderHook(() => useSignedIn(true))
    await waitFor(() => expect(result.current).toBe(false))
    expect(window.localStorage.getItem(SIGNED_IN_HINT)).toBeNull()
  })
})
