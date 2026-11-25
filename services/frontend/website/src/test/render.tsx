import { render as rtlRender, type RenderResult } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'

import i18n from '@/i18n'
import { ThemeProvider } from '@/context/ThemeProvider'

/**
 * Render a component inside every provider the app supplies.
 *
 * Tests that render a component bare pass while the real page throws, because
 * anything reaching for a router, a theme or a translation blows up outside its
 * provider. Going through this helper keeps the test environment honest about
 * what the component actually runs in.
 */
export const renderWithProviders = (
  ui: ReactElement,
  { route = '/en' }: { route?: string } = {},
): RenderResult => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </ThemeProvider>
    </I18nextProvider>
  )

  return rtlRender(ui, { wrapper: Wrapper })
}
