import { useCallback, useEffect, useState } from 'react'

export type Resource<T> =
  | { readonly state: 'loading' }
  | { readonly state: 'error'; readonly error: unknown }
  | { readonly state: 'ready'; readonly data: T }

const LOADING = { state: 'loading' } as const

/**
 * Loads once per `key`, exposes reload, and replaces data after a mutation.
 * A response that arrives after the key changed is dropped: the result is
 * tagged with the load it belongs to, and anything else reads as loading.
 */
export const useResource = <T>(load: () => Promise<T>, key: string) => {
  const [version, setVersion] = useState(0)
  const [entry, setEntry] = useState<{ readonly tag: string; readonly resource: Resource<T> }>()
  const tag = `${key}#${version}`

  useEffect(() => {
    let live = true
    load().then(
      (data) => live && setEntry({ tag, resource: { state: 'ready', data } }),
      (error: unknown) => live && setEntry({ tag, resource: { state: 'error', error } }),
    )
    return () => {
      live = false
    }
    // `load` is a fresh closure every render; `tag` names what it loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  const replace = useCallback((data: T) => setEntry({ tag, resource: { state: 'ready', data } }), [tag])
  const resource: Resource<T> = entry?.tag === tag ? entry.resource : LOADING
  return { resource, reload, replace }
}
