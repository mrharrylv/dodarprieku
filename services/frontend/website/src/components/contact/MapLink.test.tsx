import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'

import type { MapConfig } from '@/lib/map'

const withMap = async (map: MapConfig | null) => {
  vi.resetModules()
  vi.doMock('@/config/site', async (load) => {
    const site = await load<typeof import('@/config/site')>()
    return { ...site, MAP: map }
  })
  const { MapLink } = await import('./MapLink')
  const { renderWithProviders } = await import('@/test/render')
  renderWithProviders(<MapLink><address>Street 1</address></MapLink>)
}

afterEach(() => {
  vi.doUnmock('@/config/site')
})

describe('MapLink', () => {
  it('leaves the address as it is without a map', async () => {
    await withMap(null)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('Street 1')).toBeInTheDocument()
  })

  it('links the address to the contact page map, with a visible button, when there is one', async () => {
    const { googleMap } = await import('@/lib/map')
    await withMap(googleMap('Street 1'))
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', expect.stringMatching(/\/contact#map$/))
    expect(link).toHaveTextContent('Street 1')
    expect(link.textContent).toMatch(/map|kart|карт/i)
  })
})
