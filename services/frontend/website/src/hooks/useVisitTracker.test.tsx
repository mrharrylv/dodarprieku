import { StrictMode, act } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter, useNavigate, type NavigateFunction } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const allowed = vi.hoisted(() => ({ value: true }))

vi.mock('@/config/env', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/config/env')>()
  return { ...real, ENV: { ...real.ENV, analyticsEndpoint: 'https://crm.hagroup.lv/api/track', isProd: true } }
})

// jsdom's page is http://localhost, which the real rule refuses; the rule
// itself is tested in lib/analytics.test.ts.
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  trackingAllowed: () => allowed.value,
}))

const { useVisitTracker } = await import('./useVisitTracker')

let navigate: NavigateFunction = () => undefined

const Harness = () => {
  useVisitTracker()
  navigate = useNavigate()
  return null
}

const mount = () =>
  render(
    <StrictMode>
      <MemoryRouter initialEntries={['/lv']}>
        <Harness />
      </MemoryRouter>
    </StrictMode>,
  )

const beacon = vi.fn((..._args: unknown[]) => true)
const sentTypes = () => beacon.mock.calls.map((call) => (JSON.parse(String(call[1])) as { type: string }).type)

beforeEach(() => {
  allowed.value = true
  beacon.mockClear()
  Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: beacon })
})

afterEach(() => {
  Reflect.deleteProperty(navigator, 'sendBeacon')
})

describe('useVisitTracker', () => {
  it('reports one page view on load, StrictMode notwithstanding, to the configured endpoint', () => {
    mount()
    expect(sentTypes()).toEqual(['pageview'])
    expect(beacon.mock.calls[0]?.[0]).toBe('https://crm.hagroup.lv/api/track')
  })

  it('reports each client navigation, closing the previous page view', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000)
    mount()
    now.mockReturnValue(9_000)
    act(() => {
      void navigate('/lv/about')
    })
    expect(sentTypes()).toEqual(['pageview', 'engagement', 'pageview'])
    const close = JSON.parse(String(beacon.mock.calls[1]?.[1])) as { engaged_ms: number; final: boolean }
    expect(close).toMatchObject({ engaged_ms: 8_000, final: true })
  })

  it('reports the time so far when the tab is hidden, and the scroll depth', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000)
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 1
    })
    mount()
    window.dispatchEvent(new Event('scroll'))
    now.mockReturnValue(4_000)
    window.dispatchEvent(new Event('pagehide'))
    expect(sentTypes()).toEqual(['pageview', 'engagement'])
    expect(JSON.parse(String(beacon.mock.calls[1]?.[1]))).toMatchObject({ engaged_ms: 3_000, final: false })
  })

  it('stops listening when unmounted', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000)
    const { unmount } = mount()
    unmount()
    now.mockReturnValue(5_000)
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('pagehide'))
    expect(sentTypes()).toEqual(['pageview'])
  })

  it('sends nothing at all where tracking is not allowed', () => {
    allowed.value = false
    mount()
    window.dispatchEvent(new Event('pagehide'))
    expect(beacon).not.toHaveBeenCalled()
  })
})
