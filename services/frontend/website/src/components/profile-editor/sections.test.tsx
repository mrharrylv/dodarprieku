import { fireEvent, screen, within } from '@testing-library/react'
import { useState, type ComponentType } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/test/render'
import { DeliverySection } from './DeliverySection'
import { fail, mockApi, ok } from './fetch-mock'
import { VALID_FORM } from './fixtures'
import type { ProfileForm, SectionProps } from './form-model'
import { NeedsSection } from './NeedsSection'
import { SponsorsSection } from './SponsorsSection'

const resizeImage = vi.hoisted(() => vi.fn())
vi.mock('@/lib/image-resize', () => ({ resizeImage }))

vi.mock('@/components/locker-picker/useLockers', () => ({
  useLockers: (active: boolean) =>
    active
      ? {
          kind: 'ready',
          lockers: [
            { provider: 'omniva', id: '1', name: 'Aglonas TOP pakomāts', address: 'Somersētas iela 33', city: 'Aglona' },
            { provider: 'omniva', id: '2', name: 'Ventspils Maxima pakomāts', address: 'Kuldīgas iela 1', city: 'Ventspils' },
          ],
        }
      : { kind: 'idle' },
}))

/** Renders a section with real state, and reports the latest form. */
const harness = (Section: ComponentType<SectionProps>, initial: ProfileForm, errors: Record<string, string> = {}) => {
  const seen: { form: ProfileForm } = { form: initial }
  const Harness = () => {
    const [form, setForm] = useState(initial)
    seen.form = form
    return <Section form={form} errors={errors} update={(fn) => setForm((f) => fn(f))} />
  }
  renderWithProviders(<Harness />)
  return seen
}

describe('NeedsSection', () => {
  it('asks for a category first', () => {
    harness(NeedsSection, { ...VALID_FORM, category: '' })
    expect(screen.getByText(/Vispirms solī "Par jums"/)).toBeInTheDocument()
  })

  it('ticks, notes, flags urgent and unticks', () => {
    const seen = harness(NeedsSection, { ...VALID_FORM, needs: [] })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Gardumi' }))
    expect(screen.getByText('Atzīmēts: 1')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Piezīme pie: Gardumi'), { target: { value: 'bez cukura' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Steidzami: Gardumi' }))
    expect(seen.form.needs).toEqual([{ itemId: 'gardumi', urgent: true, note: 'bez cukura' }])
    expect(screen.getAllByText('Steidzami').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Gardumi' }))
    expect(seen.form.needs).toEqual([])
  })

  it('adds a custom item, which unticking removes', () => {
    const seen = harness(NeedsSection, { ...VALID_FORM, needs: [] })
    fireEvent.click(screen.getByRole('button', { name: 'Pievienot' }))
    expect(screen.getByText('Ierakstiet, kas jums vajadzīgs.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/^Kas vajadzīgs/), { target: { value: 'Veļas mašīna' } })
    fireEvent.change(screen.getByLabelText(/^Piezīme/, { selector: 'input:not([id*="note"])' }), { target: { value: 'jauna' } })
    fireEvent.keyDown(screen.getByLabelText(/^Kas vajadzīgs/), { key: 'Enter' })
    expect(seen.form.needs).toEqual([{ itemId: 'custom', customLabel: 'Veļas mašīna', note: 'jauna', urgent: false }])
    expect(screen.getByLabelText(/^Kas vajadzīgs/)).toHaveValue('')
    fireEvent.change(screen.getByLabelText('Piezīme pie: Veļas mašīna'), { target: { value: 'lietota arī der' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Steidzami: Veļas mašīna' }))
    expect(seen.form.needs[0]).toMatchObject({ note: 'lietota arī der', urgent: true })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Veļas mašīna' }))
    expect(seen.form.needs).toEqual([])
  })

  it('shows a note error under its need', () => {
    harness(NeedsSection, VALID_FORM, { 'needs.0.note': 'too_long', needs: 'too_many' })
    expect(screen.getByText('Teksts ir par garu. Lūdzu, saīsiniet to.')).toBeInTheDocument()
    expect(screen.getByText('Var norādīt ne vairāk kā 40 vajadzības.')).toBeInTheDocument()
  })
})

describe('DeliverySection', () => {
  it('adds a parcel locker from the searchable list, and removes it', () => {
    const seen = harness(DeliverySection, VALID_FORM)
    fireEvent.click(screen.getByRole('switch', { name: 'Pakomāts' }))
    fireEvent.change(screen.getByLabelText(/^Pakomātu tīkls/), { target: { value: 'omniva' } })
    fireEvent.change(screen.getByLabelText('Meklēt pakomātu'), { target: { value: 'ventspils' } })
    expect(screen.getByText('Rādīti 1 no 1. Rakstiet, lai sašaurinātu.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Ventspils Maxima pakomāts/ }))
    expect(seen.form.delivery.parcelLockers).toEqual([
      { provider: 'omniva', lockerId: '2', name: 'Ventspils Maxima pakomāts', address: 'Kuldīgas iela 1, Ventspils' },
    ])
    fireEvent.change(screen.getByLabelText('Meklēt pakomātu'), { target: { value: 'ventspils' } })
    expect(screen.getByRole('button', { name: /jau pievienots/ })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Noņemt pakomātu Ventspils Maxima pakomāts' }))
    expect(seen.form.delivery.parcelLockers).toEqual([])
  })

  it('takes a locker typed in by hand when the provider has no list', () => {
    const seen = harness(DeliverySection, { ...VALID_FORM, delivery: { ...VALID_FORM.delivery, lockersEnabled: true } })
    fireEvent.change(screen.getByLabelText(/^Pakomātu tīkls/), { target: { value: 'dpd' } })
    expect(screen.getByText(/Šim tīklam mums nav pakomātu saraksta/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Pievienot pakomātu' }))
    expect(screen.getAllByText('Šis lauks ir obligāts.')).toHaveLength(2)
    fireEvent.change(screen.getByLabelText(/^Pakomāta nosaukums/), { target: { value: 'DPD Rimi' } })
    fireEvent.change(screen.getByLabelText(/^Pakomāta adrese/), { target: { value: 'Brīvības 1, Rīga' } })
    fireEvent.click(screen.getByRole('button', { name: 'Pievienot pakomātu' }))
    expect(seen.form.delivery.parcelLockers).toEqual([{ provider: 'dpd', name: 'DPD Rimi', address: 'Brīvības 1, Rīga' }])
  })

  it('offers the manual form beside the list too', () => {
    harness(DeliverySection, { ...VALID_FORM, delivery: { ...VALID_FORM.delivery, lockersEnabled: true } })
    fireEvent.change(screen.getByLabelText(/^Pakomātu tīkls/), { target: { value: 'omniva' } })
    fireEvent.click(screen.getByRole('button', { name: 'Mana pakomāta nav sarakstā' }))
    expect(screen.getByLabelText(/^Pakomāta nosaukums/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Atpakaļ uz sarakstu' }))
    expect(screen.getByLabelText('Meklēt pakomātu')).toBeInTheDocument()
  })

  it('prefills the post address and switches options off', () => {
    const seen = harness(DeliverySection, VALID_FORM)
    fireEvent.click(screen.getByRole('switch', { name: 'Pa pastu' }))
    expect(screen.getByLabelText(/^Pasta adrese/)).toHaveValue('Kalnciema iela 1, Rīga, LV-1048')
    fireEvent.click(screen.getByRole('switch', { name: 'Nodošanas punkts' }))
    expect(screen.getByLabelText(/^Nodošanas punkta adrese/)).toHaveValue('')
    fireEvent.change(screen.getByLabelText(/^Nodošanas punkta adrese/), { target: { value: 'Veikals' } })
    fireEvent.click(screen.getByRole('switch', { name: 'Klātienē' }))
    expect(seen.form.delivery.inPerson.enabled).toBe(false)
    expect(seen.form.delivery.dropOff).toMatchObject({ enabled: true, address: 'Veikals' })
  })
})

describe('SponsorsSection', () => {
  it('explains the wall is public and counted in the leaderboard', () => {
    harness(SponsorsSection, VALID_FORM)
    expect(screen.getByText(/redzami jūsu publiskajā lapā/)).toBeInTheDocument()
    expect(screen.getByText(/atbalstītāju topā/)).toBeInTheDocument()
    expect(screen.getByText('Atbalstītāju vēl nav.')).toBeInTheDocument()
  })

  it('adds, fills, reorders and removes sponsors', () => {
    const seen = harness(SponsorsSection, VALID_FORM)
    fireEvent.click(screen.getByRole('button', { name: 'Pievienot atbalstītāju' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pievienot atbalstītāju' }))
    const names = screen.getAllByLabelText(/^Nosaukums/)
    fireEvent.change(names[0]!, { target: { value: 'SIA Pirmais' } })
    fireEvent.change(names[1]!, { target: { value: 'AS Otrais' } })
    fireEvent.change(screen.getAllByLabelText(/^Mājaslapa/)[1]!, { target: { value: 'https://otrais.lv' } })
    expect(screen.getByRole('button', { name: 'Pārvietot uz augšu: SIA Pirmais' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Pārvietot uz augšu: AS Otrais' }))
    expect(seen.form.sponsors).toEqual([{ name: 'AS Otrais', url: 'https://otrais.lv' }, { name: 'SIA Pirmais' }])
    fireEvent.click(screen.getByRole('button', { name: 'Pārvietot uz leju: AS Otrais' }))
    expect(seen.form.sponsors.map((s) => s.name)).toEqual(['SIA Pirmais', 'AS Otrais'])
    fireEvent.click(screen.getByRole('button', { name: 'Noņemt: SIA Pirmais' }))
    expect(seen.form.sponsors).toEqual([{ name: 'AS Otrais', url: 'https://otrais.lv' }])
  })

  it('uploads a sponsor logo', async () => {
    resizeImage.mockResolvedValue({
      ok: true,
      image: { contentType: 'image/webp', dataBase64: 'AA==', bytes: 1, width: 1, height: 1 },
    })
    mockApi({ 'POST /api/uploads': ok({ key: 'uploads/2026/11/sponsor01.webp', url: '/media/x' }) })
    const seen = harness(SponsorsSection, { ...VALID_FORM, sponsors: [{ name: 'SIA Labie' }] })
    const input = screen.getByTestId('file-input')
    fireEvent.change(input, { target: { files: [new File(['x'], 'logo.png', { type: 'image/png' })] } })
    expect(await screen.findByRole('img', { name: 'SIA Labie logotips' })).toBeInTheDocument()
    expect(seen.form.sponsors[0]?.logo).toBe('uploads/2026/11/sponsor01.webp')
    fireEvent.click(screen.getByRole('button', { name: 'Noņemt logotipu' }))
    expect(seen.form.sponsors[0]).toEqual({ name: 'SIA Labie' })
  })

  it('shows an upload failure beside the file', async () => {
    resizeImage.mockResolvedValue({
      ok: true,
      image: { contentType: 'image/webp', dataBase64: 'AA==', bytes: 1, width: 1, height: 1 },
    })
    mockApi({ 'POST /api/uploads': fail(413, 'too_large') })
    harness(SponsorsSection, { ...VALID_FORM, sponsors: [{ name: 'SIA Labie' }] })
    fireEvent.change(screen.getByTestId('file-input'), { target: { files: [new File(['x'], 'liels.png', { type: 'image/png' })] } })
    const item = (await screen.findByText(/Attēls ir par lielu/)).closest('li') as HTMLElement
    expect(within(item).getByText('liels.png')).toBeInTheDocument()
    fireEvent.click(within(item).getByRole('button', { name: 'Aizvērt paziņojumu par liels.png' }))
    expect(screen.queryByText(/Attēls ir par lielu/)).not.toBeInTheDocument()
  })
})
