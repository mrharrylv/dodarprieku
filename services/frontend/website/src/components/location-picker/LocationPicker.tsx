import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { GeoPoint } from '@shared/contracts'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { geocode, type GeocodeResult } from './geo'
import { MapCanvas } from './MapCanvas'

type SearchState = { readonly kind: 'idle' } | { readonly kind: 'searching' } | { readonly kind: 'done'; readonly result: GeocodeResult }

/**
 * The pin on the map, with an address search that runs only on the button
 * press. Without a working map (no WebGL, tiles blocked) the search still
 * places the point, and the page says so.
 */
export const LocationPicker = ({
  value,
  onChange,
  query,
}: {
  value: GeoPoint | null
  onChange: (point: GeoPoint) => void
  /** The address typed above, which the search looks up. */
  query: string
}) => {
  const { t } = useTranslation('register')
  const [search, setSearch] = useState<SearchState>({ kind: 'idle' })
  const [flyTo, setFlyTo] = useState<GeoPoint | null>(null)
  const [mapState, setMapState] = useState<'loading' | 'ready' | 'error'>('loading')

  const run = async () => {
    setSearch({ kind: 'searching' })
    const result = await geocode(query)
    setSearch({ kind: 'done', result })
    if (result.ok) {
      setFlyTo(result.point)
      onChange(result.point)
    }
  }

  const result = search.kind === 'done' ? search.result : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={() => void run()} loading={search.kind === 'searching'} loadingLabel={t('location.searching')}>
          {t('location.search')}
        </Button>
        <p className="text-(length:--text-sm) text-(--text-secondary)">{t('location.searchHint')}</p>
      </div>

      {result && !result.ok && (
        <Alert tone={result.error === 'not_found' || result.error === 'outside' || result.error === 'empty' ? 'warning' : 'error'}
          title={t(`location.searchErrors.${result.error}.title`)}>
          {t(`location.searchErrors.${result.error}.body`)}
        </Alert>
      )}
      {result?.ok && <Alert tone="success" title={t('location.found')} />}

      <MapCanvas value={value} onChange={onChange} flyTo={flyTo} label={t('location.mapLabel')} onState={setMapState} />
      {mapState === 'loading' && <p className="text-(length:--text-sm) text-(--text-muted)">{t('location.mapLoading')}</p>}
      {mapState === 'error' && (
        <Alert tone="warning" title={t('location.mapError.title')}>
          {t('location.mapError.body')}
        </Alert>
      )}

      <p className="text-(length:--text-sm) text-(--text-secondary)" aria-live="polite">
        {value ? t('location.pinAt', { lat: value.lat.toFixed(5), lng: value.lng.toFixed(5) }) : t('location.noPin')}
      </p>
    </div>
  )
}
