import { act } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { useHydrated } from './useHydrated'

const Probe = ({ onRender }: { onRender?: (hydrated: boolean) => void }) => {
  const hydrated = useHydrated()
  onRender?.(hydrated)
  return <span data-testid="state">{hydrated ? 'client' : 'server'}</span>
}

describe('useHydrated', () => {
  it('is false on the server', () => {
    expect(renderToString(<Probe />)).toContain('server')
  })

  it('is true from the first render of a page React renders from scratch', () => {
    const seen: boolean[] = []
    render(<Probe onRender={(hydrated) => seen.push(hydrated)} />)
    expect(seen[0]).toBe(true)
    expect(screen.getByTestId('state')).toHaveTextContent('client')
  })

  it('reproduces the server answer while hydrating, then switches without a mismatch', async () => {
    const container = document.createElement('div')
    container.innerHTML = renderToString(<Probe />)
    document.body.appendChild(container)
    const onRecoverableError = vi.fn()
    const seen: boolean[] = []

    await act(async () => {
      hydrateRoot(container, <Probe onRender={(hydrated) => seen.push(hydrated)} />, { onRecoverableError })
    })

    expect(seen[0]).toBe(false)
    expect(seen.at(-1)).toBe(true)
    expect(container.textContent).toBe('client')
    expect(onRecoverableError).not.toHaveBeenCalled()
    container.remove()
  })
})
