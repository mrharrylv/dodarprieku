import { act } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { render } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'

import { CopyrightYear } from './CopyrightYear'

describe('CopyrightYear', () => {
  afterEach(() => vi.useRealTimers())

  it('prints the build year in prerendered HTML', () => {
    expect(renderToString(<CopyrightYear />)).toBe(String(__BUILD_YEAR__))
  })

  it("prints the visitor's year when rendered in the browser", () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2031-06-01T12:00:00Z') })
    const { container } = render(<CopyrightYear />)
    expect(container.textContent).toBe('2031')
  })

  it('hydrates a page built last year without a mismatch, then shows this year', async () => {
    const container = document.createElement('div')
    container.innerHTML = renderToString(<CopyrightYear />)
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(`${__BUILD_YEAR__ + 1}-01-02T12:00:00Z`) })
    const onRecoverableError = vi.fn()

    await act(async () => {
      hydrateRoot(container, <CopyrightYear />, { onRecoverableError })
    })

    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(container.textContent).toBe(String(__BUILD_YEAR__ + 1))
  })
})
