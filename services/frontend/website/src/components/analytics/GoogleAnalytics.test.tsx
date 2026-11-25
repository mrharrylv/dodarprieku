import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { useNavigate } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { STORAGE_KEYS } from '@/config/site'
import { hasGoogleAnalytics } from '@/config/env'
import { renderWithProviders } from '@/test/render'
import { CONSENT_VERSION, loadConsent, saveConsent } from './consent-store'
import { ConsentSettingsButton } from './ConsentSettingsButton'
import { requestConsentReopen } from './consent-events'
import { ConsentedAnalytics, GoogleAnalytics } from './GoogleAnalytics'
import { GTAG_SCRIPT_ID, gtagScriptUrl } from './gtag'

const ID = 'G-TEST1234'
type GaWindow = Window & { dataLayer?: unknown[]; gtag?: unknown } & Record<string, unknown>
const win = window as unknown as GaWindow

let navigate: (to: string) => void = () => undefined
const Navigator = () => {
  navigate = useNavigate() as (to: string) => void
  return null
}

const pageViews = () =>
  (win.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>)).filter((args) => args[0] === 'event' && args[1] === 'page_view')

describe('Google Analytics gating', () => {
  beforeEach(() => {
    document.getElementById(GTAG_SCRIPT_ID)?.remove()
    delete win.dataLayer
    delete win.gtag
  })

  it('renders nothing and loads nothing when the build has no measurement id', async () => {
    expect(hasGoogleAnalytics()).toBe(false)
    expect(hasGoogleAnalytics({ isProd: false, gaMeasurementId: ID })).toBe(false)
    expect(hasGoogleAnalytics({ isProd: true, gaMeasurementId: ID })).toBe(true)
    const { container } = renderWithProviders(
      <>
        <GoogleAnalytics />
        <ConsentSettingsButton />
      </>,
    )
    await act(async () => Promise.resolve())
    expect(container).toBeEmptyDOMElement()
    expect(document.getElementById(GTAG_SCRIPT_ID)).toBeNull()
  })

  it('asks first, and loads nothing until the visitor agrees', async () => {
    renderWithProviders(<ConsentedAnalytics measurementId={ID} />)
    const banner = await screen.findByRole('region', { name: /Google Analytics/ })
    expect(banner).toBeInTheDocument()
    expect(document.getElementById(GTAG_SCRIPT_ID)).toBeNull()
    // Reject comes first, as easy as accept.
    const buttons = screen.getAllByRole('button')
    expect(buttons.map((b) => b.textContent)).toEqual(['Nepiekrītu', 'Piekrītu'])
  })

  it('loads gtag by URL after consent, anonymised, and sends a page view per route', async () => {
    renderWithProviders(
      <>
        <Navigator />
        <ConsentedAnalytics measurementId={ID} />
      </>,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Piekrītu' }))
    const script = document.getElementById(GTAG_SCRIPT_ID) as HTMLScriptElement
    expect(script.src).toBe(gtagScriptUrl(ID))
    expect(script.async).toBe(true)
    const config = (win.dataLayer ?? []).map((e) => Array.from(e as ArrayLike<unknown>)).find((a) => a[0] === 'config')
    expect(config).toEqual(['config', ID, { anonymize_ip: true, send_page_view: false }])
    expect(screen.queryByRole('region')).toBeNull()
    expect(loadConsent()?.analytics).toBe(true)
    await waitFor(() => expect(pageViews()).toHaveLength(1))
    act(() => navigate('/par-projektu'))
    await waitFor(() => expect(pageViews()).toHaveLength(2))
    expect(pageViews()[1]?.[2]).toEqual(expect.objectContaining({ page_path: '/par-projektu' }))
  })

  it('remembers a refusal, loads nothing, and can ask again', async () => {
    saveConsent(false)
    renderWithProviders(<ConsentedAnalytics measurementId={ID} />)
    await act(async () => Promise.resolve())
    expect(screen.queryByRole('region')).toBeNull()
    act(() => requestConsentReopen())
    fireEvent.click(await screen.findByRole('button', { name: 'Nepiekrītu' }))
    expect(win[`ga-disable-${ID}`]).toBe(true)
    expect(document.getElementById(GTAG_SCRIPT_ID)).toBeNull()
  })

  it('loads at once for a visitor who agreed earlier', async () => {
    saveConsent(true)
    renderWithProviders(<ConsentedAnalytics measurementId={ID} />)
    await waitFor(() => expect(document.getElementById(GTAG_SCRIPT_ID)).not.toBeNull())
  })
})

describe('consent store', () => {
  it('ignores a stale, foreign or malformed answer', () => {
    expect(loadConsent()).toBeNull()
    saveConsent(true, 1_000)
    expect(loadConsent(1_000)?.analytics).toBe(true)
    expect(loadConsent(1_000 + 400 * 24 * 60 * 60 * 1000)).toBeNull()
    window.localStorage.setItem(STORAGE_KEYS.consent, JSON.stringify({ analytics: true, at: Date.now(), version: CONSENT_VERSION + 1 }))
    expect(loadConsent()).toBeNull()
    window.localStorage.setItem(STORAGE_KEYS.consent, JSON.stringify({ analytics: 'yes' }))
    expect(loadConsent()).toBeNull()
  })
})

describe('the settings button', () => {
  it('reopens the question through a window event', () => {
    const listener = vi.fn()
    window.addEventListener('dodarprieku:consent-reopen', listener)
    requestConsentReopen()
    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener('dodarprieku:consent-reopen', listener)
  })
})
