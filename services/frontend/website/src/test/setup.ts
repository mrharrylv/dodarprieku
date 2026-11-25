import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

import i18n from '@/i18n'

/**
 * Test environment setup.
 *
 * The goal is that every test starts from the same known state. Shared state
 * leaking between tests is the usual cause of a suite that passes alone and
 * fails in CI, or vice versa, and of the "it only fails when run second" bug
 * that costs an afternoon.
 */

// jsdom has no matchMedia, and the map and the panels call it. Without this,
// every component test that reaches for it throws.
beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )

  // jsdom implements scrollTo as a stub that warns. Silence it rather than let
  // a "not implemented" line appear in every test run's output.
  vi.stubGlobal('scrollTo', vi.fn())

  window.localStorage.clear()

  // Tests assert against English copy. A test that changed the language would
  // otherwise leave it changed for whatever runs next.
  if (i18n.resolvedLanguage !== 'lv') void i18n.changeLanguage('lv')
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  window.localStorage.clear()
})

// jsdom has no canvas. Without this it logs "Not implemented" for every
// decorative <Sparks> rendered; returning null is what a browser without a
// 2D context does, and the component already handles it by drawing nothing.
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: () => null,
})
