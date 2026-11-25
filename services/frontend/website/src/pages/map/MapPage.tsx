import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

import { ROUTES } from '@/config/site'
import { useHydrated } from '@/hooks/useHydrated'
import { useLocale } from '@/hooks/useLocale'
import { useSnapshot } from '@/hooks/useSnapshot'
import { cn } from '@/lib/cn'
import { localePath } from '@/lib/locale-path'
import { filterCharities, findBySlug } from '@/lib/snapshot'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { MapPanel, type PanelFilter } from '@/components/map/MapPanel'
import type { MapFocus } from '@/components/map/MapView'
import { FOCUS_PARAM } from '@/components/charity/focus-param'

/** The map itself is its own chunk: nothing about it belongs in the first paint. */
const MapView = lazy(() => import('@/components/map/MapView').then((m) => ({ default: m.MapView })))


const NO_FILTER: PanelFilter = { query: '', category: null }

/**
 * The home page: the charity map, full height under the header, with the
 * side panel (a bottom sheet on a phone).
 *
 * The prerendered HTML is the panel's heading and intro over a soft map
 * skeleton. The snapshot is fetched, and MapLibre loaded, only after
 * hydration; nothing here reads the window or storage on the first render.
 */
export const MapPage = () => {
  const { t } = useTranslation('map')
  const { locale } = useLocale()
  const hydrated = useHydrated()
  const snapshot = useSnapshot()
  const [params] = useSearchParams()
  const [filter, setFilter] = useState<PanelFilter>(NO_FILTER)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focus, setFocus] = useState<MapFocus | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const handledParam = useRef(false)

  const charities = snapshot.status === 'ready' ? snapshot.snapshot.charities : []
  const visible = filterCharities(charities, filter)

  const choose = (id: string) => {
    setSelectedId(id)
    setFocus((prev) => ({ id, nonce: (prev?.nonce ?? 0) + 1 }))
    setSheetOpen(false)
  }

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
      <section
        aria-labelledby="map-title"
        className="relative flex h-[calc(100dvh-4rem)] min-h-[34rem] overflow-hidden bg-(--surface-sunken) sm:h-[calc(100dvh-5rem)]"
      >
        <aside
          aria-label={t('panel.label')}
          className={cn(
            'absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-(--radius-2xl) bg-(--surface-raised) shadow-(--shadow-lifted)',
            'transition-[max-height] duration-300 ease-(--ease-out-soft)',
            sheetOpen ? 'max-h-[85%]' : 'max-h-[42%]',
            'lg:static lg:z-auto lg:max-h-none lg:w-104 lg:shrink-0 lg:rounded-none lg:border-r lg:border-(--border-subtle) lg:shadow-none',
          )}
        >
          <button
            type="button"
            onClick={() => setSheetOpen((open) => !open)}
            aria-expanded={sheetOpen}
            className="flex min-h-11 w-full shrink-0 flex-col items-center justify-center gap-1 pt-2 text-(length:--text-xs) font-medium text-(--text-secondary) lg:hidden"
          >
            <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-(--border-strong)" />
            {sheetOpen ? t('panel.collapse') : t('panel.expand')}
          </button>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <MapPanel
              state={snapshot}
              filter={filter}
              onFilter={setFilter}
              selectedId={selectedId}
              onChoose={choose}
              onRetry={snapshot.retry}
            />
          </div>
        </aside>
        <div className="relative min-w-0 flex-1">
          <MapSkeleton />
          {hydrated && (
            <Suspense fallback={null}>
              <div className="absolute inset-0">
                <MapView charities={visible} selectedId={selectedId} onSelect={setSelectedId} focus={focus} />
              </div>
            </Suspense>
          )}
          <div className="absolute top-4 right-4 z-10 sm:hidden">
            <ButtonLink to={localePath(ROUTES.register, locale)} size="sm" className="shadow-(--shadow-lifted)">
              <Icon name="plus" />
              {t('registerCta')}
            </ButtonLink>
          </div>
        </div>
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
