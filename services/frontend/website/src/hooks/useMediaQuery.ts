import { useCallback, useSyncExternalStore } from 'react'

const media = (query: string): MediaQueryList | null =>
  typeof window === 'undefined' || typeof window.matchMedia !== 'function' ? null : window.matchMedia(query)

/**
 * Whether a media query matches, kept current as the viewport changes (a
 * rotation, a resized window). False on the server and where matchMedia is
 * missing, so the first render is the same on both sides.
 */
export const useMediaQuery = (query: string): boolean => {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = media(query)
      if (list === null) return () => undefined
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => media(query)?.matches ?? false,
    () => false,
  )
}
