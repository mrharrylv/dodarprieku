import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import type { PublicCharity } from '@shared/contracts'
import { ROUTES } from '@/config/site'
import { useHydrated } from '@/hooks/useHydrated'
import { useLocale } from '@/hooks/useLocale'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useSnapshot } from '@/hooks/useSnapshot'
import { localePath } from '@/lib/locale-path'
import { mapRouteOf } from '@/lib/map-route'
import { hasDemoNeeds } from '@/lib/need-kinds'
import { findBySlug, mapCharities, NO_FILTER, type CharityFilter } from '@/lib/snapshot'
import { ApiErrorNotice } from '@/components/charity/ApiErrorNotice'
import { FOCUS_PARAM } from '@/components/charity/focus-param'
import type { MapFocus } from '@/components/map/MapView'
import { MapActions } from '@/components/map/chrome/MapActions'
import { MapPanels } from '@/components/map/chrome/MapPanels'
import { MapRail } from '@/components/map/chrome/MapRail'
import { MapTopBar } from '@/components/map/chrome/MapTopBar'
import { useMapPanels } from '@/components/map/chrome/useMapPanels'
import { MapDock } from '@/components/map/dock/MapDock'
import { DOCK_QUERY, useDockInset } from '@/components/map/dock/useDockInset'
import { MapSeo } from './MapSeo'

/** The map itself is its own chunk: nothing about it belongs in the first paint. */
const MapView = lazy(() => import('@/components/map/MapView').then((m) => ({ default: m.MapView })))

const NO_CHARITIES: readonly PublicCharity[] = []

/**
 * The site's one page: the charity map, full screen, with floating chrome
 * over it. The top bar (brand, search with its results, chips), the register
 * button, the rail on the left and the one panel it has open, and the large
 * panel docked on the right (registration, the account).
 *
 * Every address the site has opens it (`lib/map-route`): `/organizacija/<slug>`
 * flies to that charity with its card expanded, `/registreties` and `/konts...`
 * dock their panel, `/par-projektu` opens the info panel. The prerendered HTML
 * is the chrome, every panel closed, over a soft map skeleton; the snapshot is
 * fetched, MapLibre loaded and any panel opened only after hydration.
 */
export const MapPage = () => {
  const { t } = useTranslation('map')
  const { locale } = useLocale()
  const hydrated = useHydrated()
  const snapshot = useSnapshot()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const route = mapRouteOf(pathname)
  const [filter, setFilter] = useState<CharityFilter>(NO_FILTER)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focus, setFocus] = useState<MapFocus | null>(null)
  const handledSlug = useRef<string | null>(null)
  const mapArea = useRef<HTMLDivElement>(null)
  const dockRef = useRef<HTMLElement | null>(null)
  const home = localePath(ROUTES.home, locale)
  const docked = useMediaQuery(DOCK_QUERY)

  // The dock opens only in the browser: the prerendered page and its hydration have every panel closed.
  const dock = hydrated ? route.dock : null
  const inset = useDockInset(dockRef, dock?.kind ?? null)

  const charities = snapshot.status === 'ready' ? snapshot.snapshot.charities : NO_CHARITIES
  // Clusters hold and count only the organisations with needs; the rest are faded pins from close up.
  const { active, faded } = useMemo(() => mapCharities(charities, filter), [charities, filter])

  // Closing a shared charity's card leaves its address too, so a reload does not open it again.
  const select = useCallback(
    (id: string | null) => {
      setSelectedId(id)
      if (id === null && route.charitySlug !== null) void navigate(home, { replace: true })
    },
    [navigate, home, route.charitySlug],
  )
  // A rail panel opening closes the charity card, so it is not left half hidden behind the panel.
  const closeCard = useCallback(() => select(null), [select])
  const panels = useMapPanels({ onOpen: closeCard })

  const choose = (id: string) => {
    setSelectedId(id)
    setFocus((prev) => ({ id, nonce: (prev?.nonce ?? 0) + 1 }))
    // A search result: the map, not a rail panel, is what the visitor wants to see now.
    panels.close()
  }

  // A press on the map closes the open rail panel, the way a sheet over a map does. Never the dock:
  // it sits beside the map, which stays usable. Focus goes back to the rail only when it was inside the panel.
  const { close, panelRef, show } = panels
  useEffect(() => {
    const area = mapArea.current
    if (area === null) return undefined
    const onPointer = () => close({ restoreFocus: panelRef.current?.contains(document.activeElement) === true })
    area.addEventListener('pointerdown', onPointer)
    return () => area.removeEventListener('pointerdown', onPointer)
  }, [close, panelRef])

  // `/organizacija/<slug>` (or the older `?org=`): fly there with the card expanded, once per slug.
  const focusSlug = route.charitySlug ?? params.get(FOCUS_PARAM)
  useEffect(() => {
    if (focusSlug === null) {
      handledSlug.current = null
      return
    }
    if (snapshot.status !== 'ready' || handledSlug.current === focusSlug) return
    handledSlug.current = focusSlug
    const target = findBySlug(snapshot.snapshot.charities, focusSlug)
    if (target === undefined) return
    void Promise.resolve().then(() => {
      setSelectedId(target.id)
      setFocus((prev) => ({ id: target.id, nonce: (prev?.nonce ?? 0) + 1, expand: true }))
    })
  }, [snapshot, focusSlug])

  // `/par-projektu`: the info panel, over the map at its own address.
  useEffect(() => {
    if (!hydrated || !route.info) return
    show('info')
    void navigate(home, { replace: true })
  }, [hydrated, route.info, show, navigate, home])

  const closeDock = () => {
    const kind = dock?.kind
    void navigate(home)
    // Focus returns to what opened it: the register button or the rail's account link.
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-dock-trigger="${kind ?? ''}"]`)?.focus())
  }

  const charity = route.charitySlug === null ? undefined : findBySlug(charities, route.charitySlug)
  // Below DOCK_QUERY the dock is a full-screen sheet: what is behind it leaves the tab order and the accessibility tree.
  const sheet = dock !== null && !docked
  // While a dock is open the register button is hidden, so the top bar needs no room for it.
  const style = { '--dock-inset': `${inset}px`, '--actions-room': dock === null ? '19rem' : '2rem' } as CSSProperties

  return (
    <>
      <MapSeo route={route} charity={charity} />
      <section aria-labelledby="map-title" style={style} className="relative h-full min-h-[32rem] overflow-hidden bg-(--surface-sunken)">
        <div className="contents" inert={sheet} data-map-layer="">
          <h1 id="map-title" className="sr-only">
            {t('title')}
          </h1>
          <p className="sr-only">{t('intro')}</p>
          <div ref={mapArea} className="absolute inset-0">
            <MapSkeleton />
            {hydrated && (
              <Suspense fallback={null}>
                <div className="absolute inset-0">
                  <MapView charities={active} faded={faded} selectedId={selectedId} onSelect={select} focus={focus} insetRight={inset} />
                </div>
              </Suspense>
            )}
          </div>
          <MapTopBar state={snapshot} filter={filter} onFilter={setFilter} selectedId={selectedId} onChoose={choose} onRetry={snapshot.retry} />
          <MapActions hidden={dock !== null} />
          <MapRail panels={panels} accountOpen={dock?.kind === 'account'} />
          <MapPanels panels={panels} state={snapshot} onRetry={snapshot.retry} />
          {hasDemoNeeds(charities) && <DemoNotice text={t('demo')} />}
          {snapshot.status === 'error' && panels.open === null && (
            <div className="absolute inset-x-3 bottom-20 z-20 md:right-auto md:bottom-6 md:left-20 md:w-96">
              <ApiErrorNotice error={snapshot.error} title={t('loadError')} onRetry={snapshot.retry} />
            </div>
          )}
        </div>
        {dock !== null && <MapDock dock={dock} panelRef={dockRef} onClose={closeDock} />}
      </section>
    </>
  )
}

/**
 * While any needs on the map were made up (dev's demo-needs task, `make run`),
 * a small chip says so, bottom left: above the register button on a phone,
 * beside the rail's foot on a wider screen.
 */
const DemoNotice = ({ text }: { text: string }) => (
  <p
    role="note"
    className="pointer-events-none absolute bottom-24 left-3 z-20 max-w-[calc(100%-1.5rem)] rounded-full border border-(--border-subtle) bg-(--surface-raised)/90 px-3 py-1.5 text-(length:--text-xs) text-(--text-secondary) shadow-(--shadow-subtle) backdrop-blur-md md:bottom-4 md:left-4 md:max-w-[calc(100%-2rem-var(--dock-inset,0px))]"
  >
    {text}
  </p>
)

/** A soft, map-like backdrop under the real map while it loads (and in the prerendered HTML). */
const MapSkeleton = () => (
  <div aria-hidden="true" className="absolute inset-0 overflow-hidden bg-(--surface-sunken)">
    <div className="absolute -top-1/4 -left-1/4 h-3/4 w-3/4 rounded-full bg-(--surface-accent-soft) opacity-60 blur-3xl" />
    <div className="absolute right-0 bottom-0 h-2/3 w-2/3 rounded-full bg-(--surface-raised) opacity-70 blur-3xl" />
  </div>
)
