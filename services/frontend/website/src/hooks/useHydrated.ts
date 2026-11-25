import { useSyncExternalStore } from 'react'

const subscribeToNothing = () => () => undefined

/**
 * False while React is rendering on the server or hydrating prerendered HTML,
 * true from then on.
 *
 * Hydration has to reproduce the server's markup exactly, and the server knows
 * nothing about this visitor: not their stored theme, not today's date. A
 * component that shows something only the browser knows renders the server's
 * answer while this is false, and React re-renders it with the real one as
 * soon as hydration is done. On a page React renders from scratch (a client
 * navigation, a URL with no prerendered page) it is true from the first
 * render, so nothing flickers there.
 *
 * `useSyncExternalStore` rather than a `useEffect` flag, because it is the one
 * hook React itself switches from its server snapshot to its client snapshot
 * at exactly that moment.
 */
export const useHydrated = (): boolean =>
  useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  )
