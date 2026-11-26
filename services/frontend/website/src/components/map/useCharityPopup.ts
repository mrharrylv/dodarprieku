import { useEffect, useRef, useState, type RefObject } from 'react'
import type { Map as MlMap, Popup } from 'maplibre-gl'

import type { PublicCharity } from '@shared/contracts'
import { drawnAt, type DrawnAt } from '@/lib/snapshot'
import { EXPANDED_PIN_FROM_BOTTOM_PX, FLY_DURATION_MS, POPUP_OFFSET, POPUP_PAN_OFFSET_PX, popupPanOffset } from './map-config'
import { prefersReducedMotion, type MaplibreModule } from './maplibre-engine'

interface Options {
  readonly ready: boolean
  readonly mapRef: RefObject<MlMap | null>
  readonly libRef: RefObject<MaplibreModule | null>
  /** Set by a fly-to from the list or ?org=: it already lands the pin where the small card wants it. */
  readonly flyingToRef: RefObject<string | null>
  /** The docked panel's width: the card is centred in the part of the map left of it. */
  readonly insetRef: RefObject<number>
  readonly selected: PublicCharity | undefined
  /** Where charities sharing an address are drawn, so the popup sits on the pin. */
  readonly at: DrawnAt
  readonly expanded: boolean
  /** The expanded card is a bottom sheet on a phone, not a popup: no popup then. */
  readonly sheet: boolean
  readonly onClosed: () => void
}

/** The map's padding for a docked panel `inset` pixels wide on the right: every camera move centres left of it. */
export const mapPadding = (inset: number) => ({ top: 0, bottom: 0, left: 0, right: inset })

/** Where a selected pin settles from the (padded) centre: lower middle for the small card, near the bottom for the expanded one. */
export const pinOffset = (map: MlMap, expanded: boolean): [number, number] => {
  const below = expanded ? map.getContainer().clientHeight / 2 - EXPANDED_PIN_FROM_BOTTOM_PX : POPUP_PAN_OFFSET_PX
  return [popupPanOffset()[0], Math.max(POPUP_PAN_OFFSET_PX, below)]
}

/**
 * The popup of the selected charity: a MapLibre popup anchored above its pin,
 * the card portalled into it. The map eases so the small card opens above
 * the pin with room to spare, and, when the card expands, so the pin sits
 * near the bottom edge and the card can grow upwards in place.
 */
export const useCharityPopup = ({ ready, mapRef, libRef, flyingToRef, insetRef, selected, at, expanded, sheet, onClosed }: Options): HTMLElement | null => {
  const [node, setNode] = useState<HTMLElement | null>(null)
  // Read when the popup opens or the map eases, never a reason to do either again.
  const atRef = useRef(at)
  useEffect(() => {
    atRef.current = at
  })

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
      .setLngLat(drawnAt(selected, atRef.current))
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
    // A fly-to already lands the pin where its card wants it (expanded, for a shared link).
    if (flyingToRef.current === selected.id) {
      flyingToRef.current = null
      return
    }
    flyingToRef.current = null
    map.easeTo({
      center: drawnAt(selected, atRef.current),
      offset: pinOffset(map, expanded),
      padding: mapPadding(insetRef.current),
      duration: prefersReducedMotion() ? 0 : FLY_DURATION_MS / 2,
    })
  }, [ready, mapRef, flyingToRef, insetRef, selected, expanded, sheet])

  return node
}
