import { createContext } from 'react'

/**
 * The two themes, and the only two choices the visitor has. There is no
 * "system" option (Harry, 2026-11-06): the toggle switches between light and
 * dark and nothing else.
 */
export type ThemePreference = 'light' | 'dark'

/** What is actually on screen. */
export type ResolvedTheme = ThemePreference

export interface ThemeContextValue {
  /** What the visitor chose, or `null` before they have touched the toggle. */
  readonly preference: ThemePreference | null
  readonly resolved: ResolvedTheme
  readonly setPreference: (preference: ThemePreference) => void
}

/**
 * Undefined by default so `useTheme` can tell "no provider above me" from
 * "provider with a default value" and throw a useful error instead of silently
 * rendering an unthemed page.
 */
export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark']

export const isThemePreference = (value: unknown): value is ThemePreference =>
  typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value)

/**
 * What a stored value means. Nothing stored, storage that cannot be read and
 * a value this site never writes (including an old "system") all mean "no
 * choice yet".
 */
export const themePreference = (stored: string | null): ThemePreference | null =>
  isThemePreference(stored) ? stored : null

/** The theme the toggle switches to. */
export const otherTheme = (theme: ResolvedTheme): ResolvedTheme =>
  theme === 'dark' ? 'light' : 'dark'

/**
 * The theme on screen for a choice and the device's setting.
 *
 * A choice always wins. Before the first one, a visitor gets the theme their
 * device is set to, read once when the page loads: the site does not keep
 * following the device afterwards, because there is no "system" mode.
 *
 * THE rule. `ThemeProvider` applies it, and `public/theme-init.js` applies a
 * copy before the first paint, because it runs before this bundle exists.
 * `context/theme-init.test.ts` runs every combination through both. When they
 * disagree the provider corrects the page just after hydration, and that
 * context change blanks every lazy page still waiting for its code.
 */
export const resolveTheme = (preference: ThemePreference | null, deviceDark: boolean): ResolvedTheme =>
  preference ?? (deviceDark ? 'dark' : 'light')
