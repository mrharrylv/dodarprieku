import { useContext } from 'react'

import { ThemeContext, type ThemeContextValue } from '@/context/theme-context'
import { useHydrated } from '@/hooks/useHydrated'

/**
 * What the prerendered markup was built with. The build has no visitor, so it
 * knows no stored choice and no OS setting.
 */
const SERVER_THEME = { preference: null, resolved: 'light' } as const

/**
 * The theme, for a component that renders something from it.
 *
 * While React hydrates a prerendered page this reports `SERVER_THEME`, the
 * value the markup was built with, and the visitor's real choice straight
 * after, so the toggle's icon hydrates cleanly and then catches up.
 *
 * The switch happens HERE, in each component that asks, rather than as a
 * change of the context value. A context change after hydration reaches every
 * Suspense boundary still waiting for its code (a legal page's lazy chunk),
 * and React answers that by throwing the boundary's server markup away and
 * rendering it again from its blank fallback.
 */
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext)
  const hydrated = useHydrated()

  if (context === undefined) {
    throw new Error('useTheme must be used inside a <ThemeProvider>')
  }

  return hydrated ? context : { ...SERVER_THEME, setPreference: context.setPreference }
}
