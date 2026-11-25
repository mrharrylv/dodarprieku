import { fireEvent, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { LocationPicker } from './LocationPicker'

const mapState = vi.hoisted(() => ({ value: 'ready' as string }))
vi.mock('./MapCanvas', () => ({
  MapCanvas: ({ onState, flyTo }: { onState: (s: string) => void; flyTo: unknown }) => {
    useEffect(() => onState(mapState.value), [onState])
    return <div data-testid="map" data-fly={JSON.stringify(flyTo)} />
  },
}))

const reply = (status: number, body: unknown) =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })))

describe('LocationPicker', () => {
  it('searches only on the button, then places the pin', async () => {
    reply(200, [{ lat: '56.95', lon: '24.1' }])
    const onChange = vi.fn()
    renderWithProviders(<LocationPicker value={null} onChange={onChange} query="Brīvības iela 1, Rīga" />)
    expect(fetch).not.toHaveBeenCalled()
    expect(screen.getByText('Spraudīte vēl nav novietota.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Meklēt adresi' }))
    expect(await screen.findByText(/Adrese atrasta/)).toBeInTheDocument()
    expect(onChange).toHaveBeenCalledWith({ lat: 56.95, lng: 24.1 })
    expect(screen.getByTestId('map').dataset.fly).toBe('{"lat":56.95,"lng":24.1}')
  })

  it('says when nothing was found', async () => {
    reply(200, [])
    renderWithProviders(<LocationPicker value={{ lat: 57, lng: 24 }} onChange={vi.fn()} query="Nekur" />)
    expect(screen.getByText('Spraudīte novietota: 57.00000, 24.00000')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Meklēt adresi' }))
    expect(await screen.findByText('Adrese netika atrasta')).toBeInTheDocument()
  })

  it('asks for an address before searching', async () => {
    renderWithProviders(<LocationPicker value={null} onChange={vi.fn()} query="" />)
    fireEvent.click(screen.getByRole('button', { name: 'Meklēt adresi' }))
    expect(await screen.findByText('Nav ko meklēt')).toBeInTheDocument()
  })

  it('explains a map that did not load', () => {
    mapState.value = 'error'
    renderWithProviders(<LocationPicker value={null} onChange={vi.fn()} query="" />)
    expect(screen.getByText('Karti neizdevās ielādēt')).toBeInTheDocument()
    mapState.value = 'ready'
  })
})
