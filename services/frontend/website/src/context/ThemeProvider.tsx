import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { STORAGE_KEYS } from '@/config/site'
import { readRaw, writeRaw } from '@/lib/storage'
import {
  ThemeContext,
  resolveTheme,
  themePreference,
  type ResolvedTheme,
  type ThemePreference,
} from './theme-context'

const DARK_QUERY = '(prefers-color-scheme: dark)'

const deviceDark = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(DARK_QUERY).matches

const storedPreference = (): ThemePreference | null => themePreference(readRaw(STORAGE_KEYS.theme))

/**
 * Light/dark theming.
 *
 * The initial value is read synchronously in `useState`'s initialiser rather
 * than in an effect. An effect runs AFTER the first paint, which is exactly the
 * full-screen flash of the wrong theme that every visitor sees once, and the
 * pre-paint script `public/theme-init.js` exists for the same reason, covering
 * the gap before React has mounted at all. Both read the same two inputs (the
 * stored preference and the OS media query) at the same moment and resolve
 * them with the same rule (`resolveTheme`), so the provider has
 * nothing to correct afterwards either: blocked storage and a value this site
 * never wrote both mean "no choice yet" in each.
 *
 * Two themes only, light and dark: no "system" mode. The device's setting is
 * read once, as the starting theme for a visitor who has not chosen, and not
 * followed afterwards. If you change the storage key, the
 * attribute name or the rule here, change it there in the same commit.
 *
 * The context always holds the real values, and the `data-theme` attribute
 * is written from them, so the page never paints in the wrong theme. What
 * the prerendered markup was built with is `useTheme`'s concern: see there.
 */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [preference, setPreferenceState] = useState<ThemePreference | null>(storedPreference)
  // Read once, in the initialiser, exactly as theme-init.js reads it before
  // the first paint. Not a subscription: there is no "system" mode to follow.
  const [startsDark] = useState(deviceDark)
  const resolved: ResolvedTheme = resolveTheme(preference, startsDark)

  // The attribute is what every `dark:` variant and every semantic token keys
  // off. `colorScheme` additionally tells the browser to render its own chrome
  //: scrollbars, form controls, the address bar on mobile: to match.
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', resolved)
    root.style.colorScheme = resolved
  }, [resolved])

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    // A failed write is not an error worth surfacing: the theme still applies
    // for this session, it just will not be remembered next time.
    writeRaw(STORAGE_KEYS.theme, next)
  }, [])

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
