import type { Dock } from '@/lib/map-route'

type RegisterModule = typeof import('@/components/register/RegisterPanel')
type AccountModule = typeof import('@/components/account/AccountDock')

/**
 * Fetches a chunk once and shares the promise. A failed fetch is forgotten,
 * so the next attempt (opening the dock) tries again instead of reusing the
 * rejection; the rejection itself still reaches the caller.
 */
const once = <T>(load: () => Promise<T>): (() => Promise<T>) => {
  let pending: Promise<T> | null = null
  return () => {
    pending ??= load().catch((error: unknown) => {
      pending = null
      throw error
    })
    return pending
  }
}

/**
 * The docks' chunks, shared by the lazy components in `MapDock` and by
 * `preloadDock`, which the buttons that open a dock call on hover, focus or
 * touch, so the panel usually has its content before it slides in.
 */
export const loadRegisterPanel = once<RegisterModule>(() => import('@/components/register/RegisterPanel'))
export const loadAccountDock = once<AccountModule>(() => import('@/components/account/AccountDock'))

/** Starts fetching a dock's chunk. A failure is left to the lazy component, which shows it when the dock opens. */
export const preloadDock = (kind: Dock['kind']): void => {
  const load = kind === 'register' ? loadRegisterPanel : loadAccountDock
  load().catch(() => undefined)
}

/** The props that preload a dock from whatever opens it. */
export const preloadProps = (kind: Dock['kind']) => {
  const preload = () => preloadDock(kind)
  return { onPointerEnter: preload, onFocus: preload, onTouchStart: preload }
}
