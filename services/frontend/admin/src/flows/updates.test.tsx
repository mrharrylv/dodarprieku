import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ok } from '../test/fetch'
import { detail, profile, summary } from '../test/fixtures'
import { renderApp } from '../test/render'

const live = profile()
const proposed = profile({
  organization: { ...live.organization, phone: '+371 29999999' },
  needs: [live.needs[0]!, { itemId: 'segas', urgent: true }],
  photos: [live.photos[1]!, live.photos[0]!],
  sponsors: [],
})
const withUpdate = detail({ id: 'u1', hasPendingUpdate: true, pendingUpdate: { profile: proposed, submittedAt: '2026-11-21T09:00:00Z' } })

describe('pending updates', () => {
  it('lists organisations with a pending update', async () => {
    renderApp('/izmainas', {
      'GET /api/admin/charities': () => ok([summary({ id: 'u1', name: 'Ar izmaiņām', hasPendingUpdate: true }), summary({ id: 'x', name: 'Bez' })]),
    })
    expect(await screen.findByRole('link', { name: /Ar izmaiņām/ })).toHaveAttribute('href', '/izmainas/u1')
    expect(screen.queryByRole('link', { name: /Bez/ })).toBeNull()
  })

  it('shows an empty list', async () => {
    renderApp('/izmainas')
    expect(await screen.findByText('Izmaiņu pieprasījumu nav.')).toBeInTheDocument()
  })

  it('shows the field-by-field diff with written status, and can show unchanged fields too', async () => {
    renderApp('/izmainas/u1', { 'GET /api/admin/charities/u1': () => ok(withUpdate) })
    expect(await screen.findByText('6 izmaiņas')).toBeInTheDocument()
    const phoneRow = screen.getByRole('rowheader', { name: /Tālrunis/ }).closest('tr')!
    expect(phoneRow).toHaveAttribute('data-status', 'changed')
    expect(within(phoneRow).getByText('+371 26000001')).toBeInTheDocument()
    expect(within(phoneRow).getByText('+371 29999999')).toBeInTheDocument()
    expect(screen.queryByRole('rowheader', { name: /Juridiskais nosaukums/ })).toBeNull()
    expect(screen.getAllByText('Pievienots').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Noņemts').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pārvietots')).toHaveLength(2)
    expect(screen.getByText('vāka foto')).toBeInTheDocument()

    await userEvent.setup().click(screen.getByLabelText('Rādīt tikai izmaiņas'))
    expect(screen.getByRole('rowheader', { name: /Juridiskais nosaukums/ })).toBeInTheDocument()
  })

  it('says when the proposal changes nothing, and when there is none', async () => {
    renderApp('/izmainas/u1', {
      'GET /api/admin/charities/u1': () => ok({ ...withUpdate, pendingUpdate: { profile: live, submittedAt: '2026-11-21' } }),
    })
    expect(await screen.findByText('Piedāvātais profils neatšķiras no publicētā.')).toBeInTheDocument()
  })

  it('handles an organisation without a pending update', async () => {
    renderApp('/izmainas/u1', { 'GET /api/admin/charities/u1': () => ok(detail({ id: 'u1' })) })
    expect(await screen.findByText('Šai organizācijai nav gaidošu izmaiņu.')).toBeInTheDocument()
  })

  it('approves and rejects with a reason', async () => {
    const { calls } = renderApp('/izmainas/u1', {
      'GET /api/admin/charities/u1': () => ok(withUpdate),
      'POST /api/admin/charities/u1/update/approve': () => ok(detail({ id: 'u1' })),
      'POST /api/admin/charities/u1/update/reject': () => ok(detail({ id: 'u1' })),
    })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Apstiprināt izmaiņas' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Apstiprināt izmaiņas' }))
    expect(await screen.findByText('Izmaiņas publicētas.')).toBeInTheDocument()
    expect(calls.some((c) => c.url.endsWith('/update/approve'))).toBe(true)
  })

  it('rejects an update with the reason', async () => {
    const { calls } = renderApp('/izmainas/u1', {
      'GET /api/admin/charities/u1': () => ok(withUpdate),
      'POST /api/admin/charities/u1/update/reject': () => ok(detail({ id: 'u1' })),
    })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Noraidīt izmaiņas' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Iemesls'), 'Foto nav kvalitatīvs')
    await user.click(within(dialog).getByRole('button', { name: 'Noraidīt izmaiņas' }))
    expect(await screen.findByText('Izmaiņas noraidītas.')).toBeInTheDocument()
    expect(calls.find((c) => c.url.endsWith('/update/reject'))?.body).toEqual({ reason: 'Foto nav kvalitatīvs' })
  })
})
