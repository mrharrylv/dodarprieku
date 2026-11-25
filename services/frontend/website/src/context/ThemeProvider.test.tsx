import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act, within } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import userEvent from '@testing-library/user-event'

import { STORAGE_KEYS } from '@/config/site'
import { ThemeProvider } from './ThemeProvider'
import { useTheme } from '@/hooks/useTheme'

/** Exercises the context through a component, the way the app uses it. */
const Probe = () => {
  const { preference, resolved, setPreference } = useTheme()
  return (
    <div>
      <span data-testid="preference">{preference}</span>
      <span data-testid="resolved">{resolved}</span>
      <button type="button" onClick={() => setPreference('dark')}>
        go dark
      </button>
      <button type="button" onClick={() => setPreference('light')}>
        go light
      </button>
    </div>
  )
}

/**
 * matchMedia stub whose `matches` the test can change.
 *
 * `matches` must be a live getter, not a captured boolean: the component reads
 * `query.matches` inside its change handler rather than trusting the event, so
 * a stub with a frozen value would report the old answer no matter what the
 * test fired, and the test would fail against correct code.
 */
const stubMatchMedia = (prefersDark: boolean) => {
  const listeners = new Set<(e: MediaQueryListEvent) => void>()
  const state = { prefersDark }

  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      get matches() {
        return state.prefersDark
      },
      media: query,
      onchange: null,
      addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) =>
        listeners.delete(cb),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )

  /** Flip the OS setting and notify, the way a real browser does. */
  const setSystemDark = (value: boolean) => {
    state.prefersDark = value
    act(() => {
      for (const listener of listeners) {
        listener({ matches: value } as MediaQueryListEvent)
      }
    })
  }

  return { setSystemDark }
}

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

describe('initial theme', () => {
  it('starts with no choice, in the light theme on a light device', () => {
    stubMatchMedia(false)
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('preference')).toBeEmptyDOMElement()
    expect(screen.getByTestId('resolved')).toHaveTextContent('light')
  })

  it('starts in the dark theme on a dark device, before any choice', () => {
    stubMatchMedia(true)
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('resolved')).toHaveTextContent('dark')
  })

  it('restores a stored preference over the system setting', () => {
    window.localStorage.setItem(STORAGE_KEYS.theme, 'dark')
    stubMatchMedia(false)

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('preference')).toHaveTextContent('dark')
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark')
  })

  it('ignores a junk stored value instead of throwing', () => {
    window.localStorage.setItem(STORAGE_KEYS.theme, 'chartreuse')
    stubMatchMedia(false)

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('preference')).toBeEmptyDOMElement()
  })

  it('treats an old stored "system" as no choice', () => {
    window.localStorage.setItem(STORAGE_KEYS.theme, 'system')
    stubMatchMedia(true)

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('preference')).toBeEmptyDOMElement()
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark')
  })

  it('reads storage synchronously, before the first paint', () => {
    // If this were read in an effect, `resolved` would be "light" on the first
    // render and every dark-mode visitor would see a white flash.
    window.localStorage.setItem(STORAGE_KEYS.theme, 'dark')
    stubMatchMedia(false)

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('resolved')).toHaveTextContent('dark')
  })
})

describe('changing the theme', () => {
  it('applies the attribute the CSS keys off', async () => {
    const user = userEvent.setup()
    stubMatchMedia(false)

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'go dark' }))

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('persists the choice', async () => {
    const user = userEvent.setup()
    stubMatchMedia(false)

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'go dark' }))

    expect(window.localStorage.getItem(STORAGE_KEYS.theme)).toBe('dark')
  })

  it('still applies the theme when storage is blocked', async () => {
    const user = userEvent.setup()
    stubMatchMedia(false)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'go dark' }))

    // Private browsing: the theme applies for this session, it just is not
    // remembered. It must not throw.
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })
})

describe('no system mode', () => {
  it('does not follow the device switching after the page has loaded', () => {
    const { setSystemDark } = stubMatchMedia(false)

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )

    // Two themes, light and dark, and no "system" mode (Harry, 2026-11-06):
    // the device's setting is only the starting point.
    setSystemDark(true)

    expect(screen.getByTestId('resolved')).toHaveTextContent('light')
  })

  it('keeps an explicit choice whatever the device does', async () => {
    const user = userEvent.setup()
    const { setSystemDark } = stubMatchMedia(true)

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'go light' }))
    setSystemDark(false)
    setSystemDark(true)

    expect(screen.getByTestId('resolved')).toHaveTextContent('light')
    expect(window.localStorage.getItem(STORAGE_KEYS.theme)).toBe('light')
  })
})

describe('useTheme outside a provider', () => {
  it('throws a message that says what is wrong', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // Silently rendering an unthemed page is much harder to diagnose than this.
    expect(() => render(<Probe />)).toThrow(/must be used inside a <ThemeProvider>/)
  })
})

describe('hydrating a prerendered page', () => {
  const serverMarkup = () => renderToString(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  )

  it('renders the neutral theme on the server, where no visitor exists', () => {
    const html = serverMarkup()
    expect(html).toContain('<span data-testid="preference"></span>')
    expect(html).toContain('light')
  })

  it('hydrates without a mismatch, then shows the stored choice', async () => {
    stubMatchMedia(false)
    const container = document.createElement('div')
    container.innerHTML = serverMarkup()
    document.body.appendChild(container)

    // What public/theme-init.js does before React loads.
    window.localStorage.setItem(STORAGE_KEYS.theme, 'dark')
    document.documentElement.setAttribute('data-theme', 'dark')

    const written: Array<string | null> = []
    const observer = new MutationObserver(() => written.push(document.documentElement.getAttribute('data-theme')))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const onRecoverableError = vi.fn()

    await act(async () => {
      hydrateRoot(
        container,
        <ThemeProvider>
          <Probe />
        </ThemeProvider>,
        { onRecoverableError },
      )
    })
    observer.disconnect()

    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(within(container).getByTestId('preference')).toHaveTextContent('dark')
    expect(within(container).getByTestId('resolved')).toHaveTextContent('dark')
    // The page never flipped to light while React caught up.
    expect(written.every((value) => value === 'dark')).toBe(true)
    container.remove()
  })
})
