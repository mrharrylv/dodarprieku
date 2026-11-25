/**
 * Local storage that cannot throw.
 *
 * Every accessor here is wrapped, because `localStorage` is not merely
 * sometimes empty: it sometimes *throws on access*: Safari private mode, a
 * browser configured to block site data, an iframe with storage partitioned
 * off. An unguarded `localStorage.getItem` in a render path takes the whole
 * page down as a white screen.
 *
 * Storage is a per-visitor convenience. Nothing here is authoritative, and
 * nothing here is ever sent anywhere.
 */

const isAvailable = (): boolean => {
  try {
    return typeof window !== 'undefined' && window.localStorage !== null
  } catch {
    return false
  }
}

/** Read a raw string. Returns `null` when absent, blocked, or unreadable. */
export const readRaw = (key: string): string | null => {
  if (!isAvailable()) return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

/** Write a raw string. Returns whether it actually persisted. */
export const writeRaw = (key: string, value: string): boolean => {
  if (!isAvailable()) return false
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    // Quota exceeded, or storage blocked. The caller carries on with its
    // in-memory value; the setting simply will not survive a reload.
    return false
  }
}

export const remove = (key: string): void => {
  if (!isAvailable()) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Nothing to do: the key is already unreachable, which is the desired end
    // state. Swallowing here is the correct handling, not a silent failure.
  }
}

/**
 * Read and parse JSON, validating the result before returning it.
 *
 * The `isValid` guard is required, not optional. Stored data is untrusted
 * input: it may have been written by an older version of the site with a
 * different shape, or edited by hand in devtools. Without the guard a shape
 * change turns into a runtime crash on someone's next visit.
 */
export const readJson = <T>(
  key: string,
  isValid: (value: unknown) => value is T,
): T | null => {
  const raw = readRaw(key)
  if (raw === null) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    return isValid(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** Serialise and write. Returns whether it persisted. */
export const writeJson = (key: string, value: unknown): boolean => {
  try {
    return writeRaw(key, JSON.stringify(value))
  } catch {
    // Circular structure, or a BigInt. A programming error rather than an
    // environment one, so make it visible instead of failing mutely.
    console.error(`[storage] could not serialise the value for "${key}"`)
    return false
  }
}
