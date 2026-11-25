import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { LOCKERS_PATH } from './locker-filter'
import { loadLockers, resetLockerCache, useLockers } from './useLockers'

const ROW = { provider: 'omniva', id: '1', name: 'A', address: 'B', city: 'C' }

describe('useLockers', () => {
  afterEach(() => resetLockerCache())

  it('does nothing until the picker is opened', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useLockers(false))
    expect(result.current).toEqual({ kind: 'idle' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('loads the snapshot once and keeps the valid rows', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([ROW, { bad: true }])))
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useLockers(true))
    await waitFor(() => expect(result.current).toEqual({ kind: 'ready', lockers: [ROW] }))
    await loadLockers()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(LOCKERS_PATH)
  })

  it('reports a missing file, and tries again next time', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('not found', { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useLockers(true))
    await waitFor(() => expect(result.current).toEqual({ kind: 'error' }))
    await loadLockers()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('reports a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(await loadLockers()).toBeNull()
  })
})
