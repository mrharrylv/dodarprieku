import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { STORAGE_KEYS } from '@/config/site'
import { fail, mockApi, ok } from '@/components/profile-editor/fetch-mock'
import { VALID_FORM } from '@/components/profile-editor/fixtures'
import { renderWithProviders } from '@/test/render'
import { RegisterPage } from './RegisterPage'

// The real map needs WebGL; the stub drops a pin with one click.
vi.mock('@/components/location-picker/MapCanvas', () => ({
  MapCanvas: ({ onChange, onState }: { onChange: (p: { lat: number; lng: number }) => void; onState: (s: string) => void }) => {
    useEffect(() => onState('ready'), [onState])
    return (
      <button type="button" onClick={() => onChange({ lat: 56.95, lng: 24.1 })}>
        stub-map
      </button>
    )
  },
}))

const field = (label: RegExp, index = 0) => screen.getAllByLabelText(label)[index] as HTMLInputElement
const type = (label: RegExp, value: string, index = 0) => fireEvent.change(field(label, index), { target: { value } })
const next = () => fireEvent.click(screen.getByRole('button', { name: /^Tālāk/ }))
const stepHeading = (name: string) => screen.findByRole('heading', { level: 2, name })

const fillOrganization = () => {
  type(/^Nosaukums, kā to redzēs/, 'Patversme Ulubele')
  type(/^Juridiskais nosaukums/, 'Biedrība "Ulubele"')
  type(/^Reģistrācijas numurs/, '40008012345')
  fireEvent.change(screen.getByLabelText(/^Juridiskā forma/), { target: { value: 'biedriba' } })
  type(/^E-pasts/, 'info@ulubele.lv', 0)
  type(/^Tālrunis/, '+371 26123456', 0)
  type(/^Vārds/, 'Anna')
  type(/^Uzvārds/, 'Bērziņa')
  type(/^E-pasts/, 'anna@ulubele.lv', 1)
  type(/^Tālrunis/, '+371 29123456', 1)
}

describe('RegisterPage', () => {
  afterEach(() => window.sessionStorage.clear())

  it('renders one h1, the progress and the first step', () => {
    renderWithProviders(<RegisterPage />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('navigation', { name: 'Reģistrācijas soļi' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Organizācija' })).toBeInTheDocument()
  })

  it('stops on an empty step, explains each field and focuses the first', async () => {
    renderWithProviders(<RegisterPage />)
    next()
    expect(await screen.findByText('Lūdzu, izlabojiet atzīmētos laukus')).toBeInTheDocument()
    const name = field(/^Nosaukums, kā to redzēs/)
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveFocus()
    expect(screen.getByText('Izvēlieties juridisko formu.')).toBeInTheDocument()
  })

  it('walks all six steps and submits the application', async () => {
    const api = mockApi({ 'POST /api/applications': ok({ id: 'app1' }) })
    renderWithProviders(<RegisterPage />)

    fillOrganization()
    next()
    await stepHeading('Par jums')

    fireEvent.click(screen.getByRole('radio', { name: /Dzīvnieku patversme/ }))
    type(/^Apraksts/, 'Mēs rūpējamies par suņiem un kaķiem.')
    next()
    await stepHeading('Atrašanās vieta')

    type(/^Iela un mājas numurs/, 'Kalnciema iela 1')
    type(/^Pilsēta vai pagasts/, 'Rīga')
    type(/^Pasta indekss/, 'LV-1048')
    next()
    expect(await screen.findByText('Novietojiet spraudīti kartē vai atrodiet adresi ar meklēšanu.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'stub-map' }))
    next()
    await stepHeading('Vajadzības')

    fireEvent.click(screen.getByRole('checkbox', { name: 'Sausā barība suņiem' }))
    type(/^Piezīme pie: Sausā barība suņiem/, 'bez graudiem')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Steidzami: Sausā barība suņiem' }))
    next()
    await stepHeading('Saņemšana')

    next()
    expect(await screen.findByText('Izvēlieties vismaz vienu veidu, kā ziedotāji var nodot lietas.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('switch', { name: 'Klātienē' }))
    expect(field(/^Adrese/)).toHaveValue('Kalnciema iela 1, Rīga, LV-1048')
    next()
    await stepHeading('Pārskats un iesniegšana')

    expect(field(/^Pieteikšanās e-pasts/)).toHaveValue('anna@ulubele.lv')
    expect(screen.getByText('Patversme Ulubele')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^Iesniegt pieteikumu/ }))
    expect(await screen.findByText('Lai iesniegtu pieteikumu, jāpiekrīt lietošanas noteikumiem.')).toBeInTheDocument()
    expect(api).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('checkbox', { name: /Esmu iepazinies/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Iesniegt pieteikumu/ }))

    expect(await screen.findByRole('heading', { name: 'Paldies! Pieteikums saņemts.' })).toBeInTheDocument()
    expect(screen.getByText(/saņemsiet e-pastu ar saiti paroles izveidei/)).toBeInTheDocument()
    const init = api.mock.calls[0]?.[1]
    expect(init?.headers).toMatchObject({ 'x-dodar-request': '1' })
    const body = JSON.parse(String(init?.body))
    expect(body).toMatchObject({
      accountEmail: 'anna@ulubele.lv',
      acceptTerms: true,
      profile: {
        category: 'dzivnieku-patversme',
        needs: [{ itemId: 'sausa-bariba-suniem', note: 'bez graudiem', urgent: true }],
        delivery: { inPerson: { address: 'Kalnciema iela 1, Rīga, LV-1048' }, parcelLockers: [] },
        address: { postalCode: 'LV-1048' },
      },
    })
    expect(body).not.toHaveProperty('website')
    expect(window.sessionStorage.getItem(STORAGE_KEYS.registerDraft)).toBeNull()
  })

  it('goes back with the progress and keeps what was typed', async () => {
    renderWithProviders(<RegisterPage />)
    fillOrganization()
    next()
    await stepHeading('Par jums')
    fireEvent.click(screen.getByRole('button', { name: /^Atpakaļ/ }))
    await stepHeading('Organizācija')
    expect(field(/^Juridiskais nosaukums/)).toHaveValue('Biedrība "Ulubele"')
    const progress = screen.getByRole('navigation', { name: 'Reģistrācijas soļi' })
    fireEvent.click(within(progress).getByRole('button', { name: /2\. solis no 6: Par jums/ }))
    await stepHeading('Par jums')
  })

  it('restores the session draft, and can start over', async () => {
    window.sessionStorage.setItem(
      STORAGE_KEYS.registerDraft,
      JSON.stringify({ version: 1, step: 4, form: VALID_FORM, accountEmail: '' }),
    )
    renderWithProviders(<RegisterPage />)
    expect(await stepHeading('Saņemšana')).toBeInTheDocument()
    expect(screen.getByText('Turpinām no vietas, kur palikāt')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sākt no jauna' }))
    await stepHeading('Organizācija')
    expect(field(/^Juridiskais nosaukums/)).toHaveValue('')
  })

  it('asks before a category change clears the ticked needs', async () => {
    window.sessionStorage.setItem(STORAGE_KEYS.registerDraft, JSON.stringify({ version: 1, step: 1, form: VALID_FORM, accountEmail: '' }))
    renderWithProviders(<RegisterPage />)
    await stepHeading('Par jums')
    fireEvent.click(screen.getByRole('radio', { name: /Bērnu nams/ }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Mainīt iestādes veidu?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Atstāt kā ir' }))
    expect(screen.getByRole('radio', { name: /Dzīvnieku patversme/ })).toBeChecked()

    fireEvent.click(screen.getByRole('radio', { name: /Bērnu nams/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Mainīt un notīrīt' }))
    expect(screen.getByRole('radio', { name: /Bērnu nams/ })).toBeChecked()
    next()
    await stepHeading('Atrašanās vieta')
    next()
    await stepHeading('Vajadzības')
    expect(screen.getByText('Atzīmēts: 0')).toBeInTheDocument()
  })

  it.each([
    [fail(429, 'rate_limited'), 'Pārāk daudz pieteikumu īsā laikā'],
    [fail(409, 'conflict'), 'Šāds pieteikums jau ir saņemts'],
    [fail(500, 'server'), 'Serverī radās kļūda'],
    ['network' as const, 'Neizdevās sazināties ar serveri'],
    [fail(403, 'forbidden'), 'Pieteikumu neizdevās iesniegt'],
  ])('shows its own copy for a failed submit (%j)', async (reply, title) => {
    mockApi({ 'POST /api/applications': reply })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    window.sessionStorage.setItem(STORAGE_KEYS.registerDraft, JSON.stringify({ version: 1, step: 5, form: VALID_FORM, accountEmail: 'a@b.lv' }))
    renderWithProviders(<RegisterPage />)
    await stepHeading('Pārskats un iesniegšana')
    fireEvent.click(screen.getByRole('checkbox', { name: /Esmu iepazinies/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Iesniegt pieteikumu/ }))
    expect(await screen.findByText(title)).toBeInTheDocument()
    expect(window.sessionStorage.getItem(STORAGE_KEYS.registerDraft)).not.toBeNull()
  })

  it('sends the person back to the step the API rejected', async () => {
    mockApi({ 'POST /api/applications': fail(400, 'validation', { 'profile.organization.regNumber': 'invalid' }) })
    window.sessionStorage.setItem(STORAGE_KEYS.registerDraft, JSON.stringify({ version: 1, step: 5, form: VALID_FORM, accountEmail: 'a@b.lv' }))
    renderWithProviders(<RegisterPage />)
    await stepHeading('Pārskats un iesniegšana')
    await userEvent.click(screen.getByRole('checkbox', { name: /Esmu iepazinies/ }))
    await userEvent.click(screen.getByRole('button', { name: /^Iesniegt pieteikumu/ }))
    await stepHeading('Organizācija')
    await waitFor(() => expect(field(/^Reģistrācijas numurs/)).toHaveFocus())
    expect(screen.getByText(/Numurā var būt tikai cipari/)).toBeInTheDocument()
  })
})
