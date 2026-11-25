/**
 * The id in a URL fragment, or null.
 *
 * A fragment is external input, so it is validated here: a malformed escape
 * sequence makes decodeURIComponent throw, and an id nobody can decode is not
 * an id. It is not an error either, so it resolves to "no anchor" and the
 * caller's own fallback takes over.
 */
export const anchorId = (hash: string): string | null => {
  if (hash === '' || hash === '#') return null
  try {
    return decodeURIComponent(hash.slice(1))
  } catch {
    return null
  }
}
