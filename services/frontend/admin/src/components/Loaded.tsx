import type { ReactNode } from 'react'
import type { Resource } from '../hooks/useResource'
import { lv } from '../i18n/lv'
import { errorMessage } from '../lib/errors'
import { ErrorState, Skeleton } from './ui'

/** Skeleton while loading, an actionable error on failure, the content when ready. */
export const Loaded = <T,>({
  resource,
  onRetry,
  rows,
  children,
}: {
  readonly resource: Resource<T>
  readonly onRetry: () => void
  readonly rows?: number
  readonly children: (data: T) => ReactNode
}) => {
  if (resource.state === 'loading') return <Skeleton rows={rows ?? 4} />
  if (resource.state === 'error') {
    return <ErrorState message={`${lv.errors.loadFailed} ${errorMessage(resource.error)}`} onRetry={onRetry} />
  }
  return <>{children(resource.data)}</>
}
