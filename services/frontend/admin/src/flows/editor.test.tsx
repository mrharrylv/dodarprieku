import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { fail, ok } from '../test/fetch'
import { detail } from '../test/fixtures'
import { renderApp } from '../test/render'

const live = detail({ id: '1', status: 'approved' })
const routes = (put: Parameters<typeof renderApp>[1] = {}) => ({
  'GET /api/admin/charities/1': () => ok(live),
  ...put,
})

const openEditor = async () => {
  const user = userEvent.setup()
  await user.click(await screen.findByRole('tab', { name: 'Rediģēt' }))
  expect(screen.getByText(/publicēti uzreiz/)).toBeInTheDocument()
  return user
}

describe('profile editor', () => {
  it('edits fields across sections and publishes the validated profile', async () => {
    const { calls } = renderApp('/organizacijas/1', routes({
      'PUT /api/admin/charities/1/profile': (body) => ok({ ...live, profile: body, updatedAt: '2026-11-25T00:00:00Z' }),
    }))
    const user = await openEditor()
    const name = screen.getAllByLabelText('Nosaukums', { selector: 'input' })[0]!
    await user.clear(name)
    await user.type(name, 'Jaunā Ulubele')
    expect(screen.getByText('Ir nesaglabātas izmaiņas.')).toBeInTheDocument()
    await user.clear(screen.getByLabelText('Mājaslapa'))
    await user.click(screen.getByLabelText('Sabiedriskā labuma organizācija'))
    await user.click(screen.getByLabelText('Gardumi'))
    await user.click(screen.getByLabelText('Var sūtīt pa pastu'))
    await user.type(screen.getByLabelText('Pa pastu: adrese'), 'Pasta iela 1, Ādaži')
    await user.click(screen.getByRole('button', { name: 'Pievienot atbalstītāju' }))
    const sponsorNames = screen.getAllByLabelText('Nosaukums', { selector: 'input' })
    await user.type(sponsorNames[sponsorNames.length - 1]!, 'AS Piens')
    await user.click(screen.getByRole('button', { name: 'Saglabāt un publicēt' }))

    expect(await screen.findByText('Profils saglabāts un publicēts.')).toBeInTheDocument()
    const sent = calls.find((c) => c.method === 'PUT')?.body as Record<string, any>
    expect(sent.organization.name).toBe('Jaunā Ulubele')
    expect(sent.organization.website).toBeUndefined()
    expect(sent.organization.publicBenefit).toBe(false)
    expect(sent.needs.map((n: { itemId: string }) => n.itemId)).toContain('gardumi')
    expect(sent.delivery.post).toEqual({ address: 'Pasta iela 1, Ādaži' })
    expect(sent.sponsors.map((s: { name: string }) => s.name)).toEqual(['SIA Barība', 'AS Piens'])
  })

  it('refuses an invalid profile locally and marks the fields', async () => {
    const { calls } = renderApp('/organizacijas/1', routes())
    const user = await openEditor()
    const email = screen.getAllByLabelText('E-pasts')[0]!
    await user.clear(email)
    await user.type(email, 'nav-epasts')
    await user.clear(screen.getByLabelText('Platums'))
    await user.type(screen.getByLabelText('Platums'), '40')
    await user.click(screen.getByRole('button', { name: 'Saglabāt un publicēt' }))
    expect(await screen.findByText(/Profilu nevar saglabāt: 2 laukos ir kļūdas/)).toBeInTheDocument()
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText(/Vieta nav Latvijā/)).toBeInTheDocument()
    expect(calls.some((c) => c.method === 'PUT')).toBe(false)
  })

  it('shows server field errors and lets the admin discard changes', async () => {
    renderApp('/organizacijas/1', routes({
      'PUT /api/admin/charities/1/profile': () => fail(400, 'validation', { 'organization.regNumber': 'invalid' }),
    }))
    const user = await openEditor()
    await user.type(screen.getByLabelText('Apraksts'), ' Vairāk.')
    await user.click(screen.getByRole('button', { name: 'Saglabāt un publicēt' }))
    expect(await screen.findByText('Dažos laukos ir kļūdas. Pārbaudiet iezīmētos laukus.')).toBeInTheDocument()
    expect(screen.getByLabelText('Reģistrācijas numurs')).toHaveAttribute('aria-invalid', 'true')
    await user.click(screen.getByRole('button', { name: 'Atmest izmaiņas' }))
    expect(screen.getByLabelText('Apraksts')).toHaveValue(live.profile.description)
  })

  it('manages needs, photos, lockers and sponsors', async () => {
    renderApp('/organizacijas/1', routes())
    const user = await openEditor()
    await user.click(screen.getByLabelText('Sausā barība suņiem'))
    expect(screen.getByLabelText('Sausā barība suņiem')).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Pievienot' }))
    const customs = screen.getAllByLabelText('Cita vajadzība')
    expect(customs).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: 'Padarīt par vāka foto' }))
    const photos = screen.getAllByAltText(/foto \d/)
    expect(photos[0]).toHaveAttribute('src', '/media/uploads/2026/11/photo-bbbb2222.webp')
    await user.click(screen.getByRole('button', { name: 'Pievienot pakomātu' }))
    expect(screen.getAllByLabelText('Pakalpojums')).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: 'Noņemt Ādažu Maxima' }))
    expect(screen.getAllByLabelText('Pakalpojums')).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Noņemt SIA Barība' }))
    expect(screen.queryByDisplayValue('SIA Barība')).toBeNull()
    await user.click(screen.getByLabelText('Var atnest klātienē'))
    expect(screen.queryByLabelText('Klātienē: adrese')).toBeNull()
  })

  it('uploads a photo and refuses the wrong file type', async () => {
    const { calls } = renderApp('/organizacijas/1', routes({
      'POST /api/uploads': () => ok({ key: 'uploads/2026/11/new-eeee5555.webp', url: '/media/uploads/2026/11/new-eeee5555.webp' }),
    }))
    const user = await openEditor()
    const media = screen.getByRole('group', { name: 'Foto un logo' })
    const inputs = within(media).getAllByLabelText('Augšupielādēt')
    await user.upload(inputs[1]!, new File([new Uint8Array([1, 2])], 'p.webp', { type: 'image/webp' }))
    expect(await screen.findByText('Attēls augšupielādēts.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByAltText(/foto \d/)).toHaveLength(3))
    expect(calls.find((c) => c.url === '/api/uploads')?.body).toMatchObject({ kind: 'photo', contentType: 'image/webp', dataBase64: 'AQI=' })

    const fresh = within(media).getAllByLabelText('Augšupielādēt')
    await userEvent.setup({ applyAccept: false }).upload(fresh[0]!, new File(['x'], 'a.gif', { type: 'image/gif' }))
    expect(await screen.findByText('Atļauti tikai JPEG, PNG vai WebP attēli.')).toBeInTheDocument()
  })
})
