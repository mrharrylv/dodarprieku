import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { SubscribeBox } from './SubscribeBox'

const fill = () => {
  fireEvent.change(screen.getByLabelText(/^E-pasts/), { target: { value: 'ilze@example.lv' } })
  fireEvent.click(screen.getByRole('checkbox', { name: /Piekrītu saņemt/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Pierakstīties' }))
}

describe('SubscribeBox', () => {
  it('validates before sending', () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    renderWithProviders(<SubscribeBox />)
    expect(screen.getByRole('heading', { name: 'Jaunumi un steidzamas vajadzības' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Pierakstīties' }))
    expect(screen.getByText('Ierakstiet e-pasta adresi.')).toBeInTheDocument()
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('subscribes, tied to the charity, and thanks', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, data: {} })))
    vi.stubGlobal('fetch', fetcher)
    renderWithProviders(<SubscribeBox charityId="c1" />)
    fill()
    expect(await screen.findByText('Paldies! Jūsu pieraksts ir saņemts.')).toBeInTheDocument()
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({ email: 'ilze@example.lv', consent: true, charityId: 'c1' })
  })

  it('shows a rate limit and the server’s field errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false, error: 'validation', fields: { email: 'invalid' } }), { status: 400 })))
    renderWithProviders(<SubscribeBox bare initialEmail="x@y.lv" />)
    expect(screen.queryByRole('heading')).toBeNull()
    fill()
    expect(await screen.findByText('Pārbaudiet e-pasta adresi.')).toBeInTheDocument()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 429 })))
    fireEvent.click(screen.getByRole('button', { name: 'Pierakstīties' }))
    expect(await screen.findByText('Pārāk daudz mēģinājumu')).toBeInTheDocument()
  })
})
