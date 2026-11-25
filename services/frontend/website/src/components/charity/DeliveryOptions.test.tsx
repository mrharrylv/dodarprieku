import { act, fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { COPIED_MS } from './CopyButton'
import { DeliveryOptions } from './DeliveryOptions'

describe('DeliveryOptions', () => {
  it('lists every way with its provider, and says when there is none', () => {
    const { unmount } = renderWithProviders(
      <DeliveryOptions
        delivery={{
          dropOff: { address: 'Veikals, Brīvības iela 1' },
          parcelLockers: [{ provider: 'dpd', name: 'DPD Pickup Origo', address: 'Stacijas laukums 2' }],
        }}
      />,
    )
    expect(screen.getByText('Nodošanas punkts')).toBeInTheDocument()
    expect(screen.getByText('Pakomāti: DPD Pickup')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Kopēt adresi/ })).toHaveLength(2)
    unmount()
    renderWithProviders(<DeliveryOptions delivery={{ parcelLockers: [] }} />)
    expect(screen.getByText(/vēl nav norādījusi, kā ziedojumus nogādāt/)).toBeInTheDocument()
  })

  it('copies an address and says so, then resets', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    renderWithProviders(<DeliveryOptions delivery={{ post: { address: 'Pasta kaste 1' }, parcelLockers: [] }} />)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Kopēt adresi: Pasta kaste 1' })))
    expect(writeText).toHaveBeenCalledWith('Pasta kaste 1')
    expect(screen.getByText('Nokopēts')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(COPIED_MS))
    expect(screen.getByText('Kopēt adresi')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('tells the visitor what to do when copying fails', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    renderWithProviders(<DeliveryOptions delivery={{ post: { address: 'Pasta kaste 1' }, parcelLockers: [] }} />)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Kopēt adresi/ })))
    expect(screen.getByRole('alert')).toHaveTextContent('Neizdevās nokopēt')
  })
})
