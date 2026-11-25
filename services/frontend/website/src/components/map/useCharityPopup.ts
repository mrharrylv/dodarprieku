import { useEffect, useState, type RefObject } from 'react'
import type { Map as MlMap, Popup } from 'maplibre-gl'

import type { PublicCharity } from '@shared/contracts'
import { EXPANDED_PIN_FROM_BOTTOM_PX, FLY_DURATION_MS, POPUP_OFFSET, POPUP_PAN_OFFSET_PX, popupPanOffset } from './map-config'
import { prefersReducedMotion, type MaplibreModule } from './maplibre-engine'

interface Options {
  readonly ready: boolean
  readonly mapRef: RefObject<MlMap | null>
  readonly libRef: RefObject<MaplibreModule | null>
  /** Set by a fly-to from the list or ?org=: it already lands the pin where the small card wants it. */
  readonly flyingToRef: RefObject<string | null>
  readonly selected: PublicCharity | undefined
  readonly expanded: boolean
  /** The expanded card is a bottom sheet on a phone, not a popup: no popup then. */
  readonly sheet: boolean
  readonly onClosed: () => void
}

const lngLat = (charity: PublicCharity): [number, number] => [charity.profile.location.lng, charity.profile.location.lat]

/**
 * The popup of the selected charity: a MapLibre popup anchored above its pin,
 * the card portalled into it. The map eases so the small card opens above
 * the pin with room to spare, and, when the card expands, so the pin sits
 * near the bottom edge and the card can grow upwards in place.
 */
export const useCharityPopup = ({ ready, mapRef, libRef, flyingToRef, selected, expanded, sheet, onClosed }: Options): HTMLElement | null => {
  const [node, setNode] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const map = mapRef.current
    const lib = libRef.current
    if (!ready || map === null || lib === null || selected === undefined || sheet) return undefined
    const element = document.createElement('div')
    const popup: Popup = new lib.Popup({
      closeButton: false,
      closeOnClick: false,
      anchor: 'bottom',
      offset: POPUP_OFFSET,
      maxWidth: 'none',
      className: 'dp-popup',
      focusAfterOpen: false,
    })
      .setLngLat(lngLat(selected))
      .setDOMContent(element)
      .addTo(map)
    let removing = false
    popup.on('close', () => {
      if (!removing) onClosed()
    })
    // Rendered into on the next frame, through a portal.
    const frame = requestAnimationFrame(() => setNode(element))
    return () => {
      cancelAnimationFrame(frame)
      removing = true
      popup.remove()
      setNode(null)
    }
    // onClosed is a fresh closure every render; the popup must not be rebuilt for it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, selected, sheet])

  // Where the pin settles: lower middle for the small card, near the bottom for the expanded one.
  useEffect(() => {
    const map = mapRef.current
    if (!ready || map === null || selected === undefined || sheet) return
    if (flyingToRef.current === selected.id && !expanded) {
      flyingToRef.current = null
      return
    }
    flyingToRef.current = null
    const below = expanded ? map.getContainer().clientHeight / 2 - EXPANDED_PIN_FROM_BOTTOM_PX : POPUP_PAN_OFFSET_PX
    map.easeTo({
      center: lngLat(selected),
      offset: [popupPanOffset()[0], Math.max(POPUP_PAN_OFFSET_PX, below)],
      duration: prefersReducedMotion() ? 0 : FLY_DURATION_MS / 2,
    })
  }, [ready, mapRef, flyingToRef, selected, expanded, sheet])

  return node
}
