import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { shelter } from '@/lib/snapshot.fixtures'
import { renderWithProviders } from '@/test/render'
import { PledgeForm } from './PledgeForm'

const NEEDS = [{ key: 'smiltis', label: 'Kaķu pakaiši', urgent: true }]

const respond = (status: number, body: unknown) =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })))

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Apstiprināt' }))

describe('PledgeForm', () => {
  const setup = () => {
    const onDone = vi.fn()
    renderWithProviders(<PledgeForm charity={shelter} needs={NEEDS} allowedKeys={['smiltis']} onDone={onDone} />)
    return onDone
  }

  it('lists what will be brought and sends an anonymous pledge', async () => {
    respond(200, { ok: true, data: { id: 'p1' } })
    const onDone = setup()
    expect(screen.getByText('Kaķu pakaiši')).toBeInTheDocument()
    submit()
    await vi.waitFor(() => expect(onDone).toHaveBeenCalledWith({ email: '', subscribed: false }))
  })

  it('asks for consent only once an email or the newsletter is involved', () => {
    setup()
    expect(screen.queryByRole('checkbox', { name: /Piekrītu/ })).toBeNull()
    fireEvent.click(screen.getByRole('checkbox', { name: /Pierakstīties jaunumiem/ }))
    expect(screen.getByRole('checkbox', { name: /Piekrītu/ })).toBeInTheDocument()
    submit()
    expect(screen.getByText('Lai pierakstītos jaunumiem, ierakstiet e-pasta adresi.')).toBeInTheDocument()
    expect(screen.getByText('Lai mēs varētu jums rakstīt, apstipriniet piekrišanu.')).toBeInTheDocument()
  })

  it.each([
    ['network', () => vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline'))), 'Nav savienojuma'],
    ['rate limited', () => respond(429, { ok: false, error: 'rate_limited' }), 'Pārāk daudz mēģinājumu'],
    ['server', () => respond(500, { ok: false, error: 'server' }), 'Kaut kas nogāja greizi'],
    ['not found', () => respond(404, { ok: false, error: 'not_found' }), 'Nav atrasts'],
  ])('shows its own message for a %s failure', async (_name, arrange, title) => {
    arrange()
    setup()
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent(title)
    expect(screen.getByRole('button', { name: 'Apstiprināt' })).toBeEnabled()
  })

  it('shows a timeout as its own failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')))
    setup()
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Serveris neatbild')
  })

  it('puts the server’s field errors beside their fields', async () => {
    respond(400, { ok: false, error: 'validation', fields: { email: 'invalid', message: 'weird_code' } })
    setup()
    fireEvent.change(screen.getByLabelText(/E-pasts/), { target: { value: 'ok@ok.lv' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /Piekrītu/ }))
    submit()
    expect(await screen.findByText('Pārbaudiet e-pasta adresi.')).toBeInTheDocument()
    // An unknown code still gets readable copy, never the raw code.
    expect(screen.getByText('Pārbaudiet šo lauku.')).toBeInTheDocument()
    expect(screen.getByText('Pārbaudiet laukus')).toBeInTheDocument()
  })

  it('sends nothing when the honeypot is filled', () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    const { container } = renderWithProviders(<PledgeForm charity={shelter} needs={NEEDS} allowedKeys={['smiltis']} onDone={vi.fn()} />)
    fireEvent.change(container.querySelector('input[name="website"]')!, { target: { value: 'bot' } })
    submit()
    expect(fetcher).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Kaut kas nogāja greizi')
  })
})
