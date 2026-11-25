import { Suspense } from 'react'
import { describe, it, expect, vi } from 'vitest'

import { renderPage } from './entry-server'

/**
 * A page that throws must fail the build, including when the error is inside
 * a Suspense boundary, where React would otherwise quietly ship the boundary's
 * fallback and leave the browser to try again.
 */
const Throws = () => {
  throw new Error('the page broke')
}

vi.mock('@/App', () => ({
  App: () => (
    <Suspense fallback={<p>loading</p>}>
      <Throws />
    </Suspense>
  ),
}))

describe('renderPage', () => {
  it('throws, naming the page, when anything in the tree threw', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const page = { key: 'lv:/par-projektu', url: '/par-projektu', locale: 'lv', route: '/par-projektu', files: [] } as const

    await expect(renderPage(page)).rejects.toThrow(/\/par-projektu threw while rendering:[\s\S]*the page broke/)
  })
})
