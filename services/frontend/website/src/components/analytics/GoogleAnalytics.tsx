import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { ENV, hasGoogleAnalytics } from '@/config/env'
import { ConsentBanner } from './ConsentBanner'
import { CONSENT_REOPEN_EVENT } from './consent-events'
import { loadConsent, saveConsent, type StoredConsent } from './consent-store'
import { disableGtag, loadGtag, sendPageView } from './gtag'

/**
 * Google Analytics, behind consent. Mounted once by the chrome.
 *
 * Renders nothing, loads nothing and asks nothing unless this is a
 * production build with a valid `VITE_GA_MEASUREMENT_ID`
 * (`hasGoogleAnalytics()`), which only the prod environment sets.
 */
export const GoogleAnalytics = () => {
  if (!hasGoogleAnalytics()) return null
  // hasGoogleAnalytics() guarantees the id.
  return <ConsentedAnalytics measurementId={ENV.gaMeasurementId ?? ''} />
}

type Decision = { readonly status: 'unknown' } | { readonly status: 'known'; readonly consent: StoredConsent | null }

/**
 * The consent question and the loader, for a known measurement id. The
 * stored answer is read in an effect, never on the first render, so the
 * prerendered HTML and hydration agree.
 */
export const ConsentedAnalytics = ({ measurementId }: { measurementId: string }) => {
  const [decision, setDecision] = useState<Decision>({ status: 'unknown' })
  const { pathname } = useLocation()
  const granted = decision.status === 'known' && decision.consent?.analytics === true

  useEffect(() => {
    let live = true
    void Promise.resolve().then(() => {
      if (live) setDecision({ status: 'known', consent: loadConsent() })
    })
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    const reopen = () => setDecision({ status: 'known', consent: null })
    window.addEventListener(CONSENT_REOPEN_EVENT, reopen)
    return () => window.removeEventListener(CONSENT_REOPEN_EVENT, reopen)
  }, [])

  useEffect(() => {
    if (granted) loadGtag(measurementId)
  }, [granted, measurementId])

  useEffect(() => {
    if (granted) sendPageView(pathname)
  }, [granted, pathname])

  const decide = (analytics: boolean) => {
    if (!analytics) disableGtag(measurementId)
    setDecision({ status: 'known', consent: saveConsent(analytics) })
  }

  if (decision.status !== 'known' || decision.consent !== null) return null
  return <ConsentBanner onAccept={() => decide(true)} onReject={() => decide(false)} />
}
