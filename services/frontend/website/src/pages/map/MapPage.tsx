import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

import { ROUTES } from '@/config/site'
import { useHydrated } from '@/hooks/useHydrated'
import { useLocale } from '@/hooks/useLocale'
import { useSnapshot } from '@/hooks/useSnapshot'
import { filterCharities, findBySlug, type CharityFilter } from '@/lib/snapshot'
import { Seo } from '@/components/seo/Seo'
import { ApiErrorNotice } from '@/components/charity/ApiErrorNotice'
import type { MapFocus } from '@/components/map/MapView'
import { PANEL_SHEET_QUERY } from '@/components/map/map-config'
import { MapActions } from '@/components/map/chrome/MapActions'
import { MapPanels } from '@/components/map/chrome/MapPanels'
import { MapRail } from '@/components/map/chrome/MapRail'
import { MapTopBar } from '@/components/map/chrome/MapTopBar'
import { useMapPanels } from '@/components/map/chrome/useMapPanels'
import { FOCUS_PARAM } from '@/components/charity/focus-param'

/** The map itself is its own chunk: nothing about it belongs in the first paint. */
const MapView = lazy(() => import('@/components/map/MapView').then((m) => ({ default: m.MapView })))

const NO_FILTER: CharityFilter = { query: '', category: null }

const isSheet = (): boolean => typeof window.matchMedia === 'function' && window.matchMedia(PANEL_SHEET_QUERY).matches

/**
 * The home page: the charity map, full screen, with floating chrome over it.
 * The top bar (brand, search, chips), the actions (register, theme), the rail
 * on the left and the one panel it has open.
 *
 * The prerendered HTML is that chrome, every panel closed, over a soft map
 * skeleton. The snapshot is fetched, and MapLibre loaded, only after
 * hydration; nothing here reads the window or storage on the first render.
 */
export const MapPage = () => {
  const { t } = useTranslation('map')
  const { locale } = useLocale()
  const hydrated = useHydrated()
  const snapshot = useSnapshot()
  const panels = useMapPanels()
  const [params] = useSearchParams()
  const [filter, setFilter] = useState<CharityFilter>(NO_FILTER)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focus, setFocus] = useState<MapFocus | null>(null)
  const handledParam = useRef(false)
  const mapArea = useRef<HTMLDivElement>(null)

  const charities = snapshot.status === 'ready' ? snapshot.snapshot.charities : []
  const visible = filterCharities(charities, filter)

  const choose = (id: string) => {
    setSelectedId(id)
    setFocus((prev) => ({ id, nonce: (prev?.nonce ?? 0) + 1 }))
    if (isSheet()) panels.close({ restoreFocus: true })
  }

  // A press anywhere on the map closes the open panel, the way a sheet over a map does.
  // Focus goes back to the rail only when it was inside the panel, so it is never lost to <body>.
  const { close, panelRef } = panels
  useEffect(() => {
    const area = mapArea.current
    if (area === null) return undefined
    const onPointer = () => close({ restoreFocus: panelRef.current?.contains(document.activeElement) === true })
    area.addEventListener('pointerdown', onPointer)
    return () => area.removeEventListener('pointerdown', onPointer)
  }, [close, panelRef])

  // Open on the charity named in ?org= once, when the snapshot arrives.
  const focusSlug = params.get(FOCUS_PARAM) ?? undefined
  useEffect(() => {
    if (handledParam.current || snapshot.status !== 'ready') return
    handledParam.current = true
    const target = findBySlug(snapshot.snapshot.charities, focusSlug)
    if (target === undefined) return
    void Promise.resolve().then(() => {
      setSelectedId(target.id)
      setFocus({ id: target.id, nonce: 1 })
    })
  }, [snapshot, focusSlug])

  return (
    <>
      <Seo title={t('meta.title')} description={t('meta.description')} path={ROUTES.home} locale={locale} />
      <section aria-labelledby="map-title" className="relative h-full min-h-[32rem] overflow-hidden bg-(--surface-sunken)">
        <h1 id="map-title" className="sr-only">
          {t('title')}
        </h1>
        <p className="sr-only">{t('intro')}</p>
        <div ref={mapArea} className="absolute inset-0">
          <MapSkeleton />
          {hydrated && (
            <Suspense fallback={null}>
              <div className="absolute inset-0">
                <MapView charities={visible} selectedId={selectedId} onSelect={setSelectedId} focus={focus} />
              </div>
            </Suspense>
          )}
        </div>
        <MapTopBar state={snapshot} filter={filter} onFilter={setFilter} />
        <MapActions />
        <MapRail panels={panels} />
        <MapPanels
          panels={panels}
          state={snapshot}
          filter={filter}
          onFilter={setFilter}
          selectedId={selectedId}
          onChoose={choose}
          onRetry={snapshot.retry}
        />
        {snapshot.status === 'error' && panels.open === null && (
          <div className="absolute inset-x-3 bottom-20 z-20 md:right-auto md:bottom-6 md:left-20 md:w-96">
            <ApiErrorNotice error={snapshot.error} title={t('loadError')} onRetry={snapshot.retry} />
          </div>
        )}
      </section>
    </>
  )
}

/** A soft, map-like backdrop under the real map while it loads (and in the prerendered HTML). */
const MapSkeleton = () => (
  <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-(--surface-sunken)">
    <div className="absolute -top-1/4 -left-1/4 h-3/4 w-3/4 rounded-full bg-(--surface-accent-soft) opacity-60 blur-3xl" />
    <div className="absolute right-0 bottom-0 h-2/3 w-2/3 rounded-full bg-(--surface-raised) opacity-70 blur-3xl" />
  </div>
)
