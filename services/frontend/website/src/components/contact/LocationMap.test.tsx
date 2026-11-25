import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'

describe('LocationMap', () => {
  it('renders nothing while MAP is null (a site that turned it off, or a placeholder address)', async () => {
    vi.resetModules()
    vi.doMock('@/config/site', async (load) => {
      const site = await load<typeof import('@/config/site')>()
      return { ...site, MAP: null }
    })
    const { LocationMap } = await import('./LocationMap')
    const { renderWithProviders: render } = await import('@/test/render')
    const { container } = render(<LocationMap />)
    expect(container.querySelector('iframe')).toBeNull()
    vi.doUnmock('@/config/site')
  })

  it('shows the map straight away, lazily, with the address and a Google Maps link', async () => {
    vi.resetModules()
    vi.doMock('@/config/site', async (load) => {
      const site = await load<typeof import('@/config/site')>()
      const { googleMap } = await import('@/lib/map')
      return { ...site, MAP: googleMap('Example street 1, Rīga') }
    })
    const { LocationMap } = await import('./LocationMap')
    const { renderWithProviders: render } = await import('@/test/render')
    const { container } = render(<LocationMap />)

    const frame = container.querySelector('iframe')
    expect(frame).not.toBeNull()
    expect(frame).toHaveAttribute('loading', 'lazy')
    expect(frame?.getAttribute('src')).toContain('output=embed')
    expect(container.querySelector('#map')).not.toBeNull()
    expect(screen.getByRole('link', { name: /google maps/i })).toHaveAttribute(
      'href',
      expect.stringContaining('google.com/maps/search'),
    )
    vi.doUnmock('@/config/site')
  })
})
