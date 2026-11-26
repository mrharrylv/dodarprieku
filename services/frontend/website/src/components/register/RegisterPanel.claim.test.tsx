import { fireEvent, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { STORAGE_KEYS } from '@/config/site'
import { resetSnapshotCache } from '@/hooks/useSnapshot'
import { mockApi, ok } from '@/components/profile-editor/fetch-mock'
import { childrenHome, shelter, snapshotFixture } from '@/lib/snapshot.fixtures'
import { renderWithProviders } from '@/test/render'
import { RegisterPanel } from './RegisterPanel'

vi.mock('@/components/location-picker/MapCanvas', () => ({
  MapCanvas: ({ onState }: { onState: (s: string) => void }) => {
    useEffect(() => onState('ready'), [onState])
    return <div />
  },
}))

const imported = { ...shelter, claimable: true }
const SNAPSHOT = { ...snapshotFixture, charities: [imported, childrenHome] }
const field = (label: RegExp, index = 0) => screen.getAllByLabelText(label)[index] as HTMLInputElement
const type = (label: RegExp, value: string, index = 0) => fireEvent.change(field(label, index), { target: { value } })
const next = () => fireEvent.click(screen.getByRole('button', { name: /^Tālāk/ }))
const stepHeading = (name: string) => screen.findByRole('heading', { level: 2, name })

describe('RegisterPanel, claiming an imported charity', () => {
  beforeEach(() => resetSnapshotCache())
  afterEach(() => window.sessionStorage.clear())

  it('fills the form in from the public profile under a banner that names it', async () => {
    mockApi({ 'GET /data/charities.json': [200, SNAPSHOT] as const })
    renderWithProviders(<RegisterPanel />, { route: '/registreties?pieprasit=ulubele' })
    expect(await screen.findByText('Jūs pieprasāt esošu profilu: Dzīvnieku patversme Ulubele')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reģistrēt citu iestādi' })).toHaveAttribute('href', '/registreties')
    expect(field(/^Nosaukums, kā to redzēs/)).toHaveValue('Dzīvnieku patversme Ulubele')
    expect(field(/^Juridiskais nosaukums/)).toHaveValue(shelter.profile.organization.legalName)
    expect(field(/^Reģistrācijas numurs/)).toHaveValue(shelter.profile.organization.regNumber)
    expect(screen.getByLabelText(/^Juridiskā forma/)).toHaveValue(shelter.profile.organization.legalForm)
    expect(field(/^E-pasts/, 0)).toHaveValue(shelter.profile.organization.email)
    // The contact person is the claimant's to write.
    expect(field(/^Vārds/)).toHaveValue('')
    // Another institution's draft in this tab is left alone.
    expect(window.sessionStorage.getItem(STORAGE_KEYS.registerDraft)).toBeNull()
  })

  it('sends the claim with the charity it asks for, and says what happens next', async () => {
    const api = mockApi({ 'GET /data/charities.json': [200, SNAPSHOT] as const, 'POST /api/applications': ok({ id: 'app1' }) })
    renderWithProviders(<RegisterPanel />, { route: '/registreties?pieprasit=ulubele' })
    await screen.findByText('Jūs pieprasāt esošu profilu: Dzīvnieku patversme Ulubele')
    type(/^Vārds/, 'Anna')
    type(/^Uzvārds/, 'Bērziņa')
    type(/^E-pasts/, 'anna@ulubele.lv', 1)
    type(/^Tālrunis/, '+371 29123456', 1)
    next()
    await stepHeading('Par jums')
    type(/^Apraksts/, 'Mēs rūpējamies par suņiem un kaķiem.')
    next()
    await stepHeading('Atrašanās vieta')
    expect(field(/^Iela un mājas numurs/)).toHaveValue(shelter.profile.address.street)
    next()
    await stepHeading('Vajadzības')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sausā barība suņiem' }))
    next()
    await stepHeading('Saņemšana')
    fireEvent.click(screen.getByRole('switch', { name: 'Klātienē' }))
    next()
    await stepHeading('Pārskats un iesniegšana')
    fireEvent.click(screen.getByRole('checkbox', { name: /Esmu iepazinies/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Iesniegt pieteikumu/ }))

    expect(await screen.findByRole('heading', { name: 'Paldies! Pieteikums saņemts.' })).toBeInTheDocument()
    expect(screen.getByText(/profils būs jūsu pārziņā, un saņemsiet e-pastu/)).toBeInTheDocument()
    const sent = api.mock.calls.find(([url]) => String(url).endsWith('/applications'))
    expect(JSON.parse(String(sent?.[1]?.body))).toMatchObject({ claimCharityId: shelter.id, profile: { organization: { name: 'Dzīvnieku patversme Ulubele' } } })
  })

  it('falls back to the ordinary registration, saying why, for a charity that cannot be claimed', async () => {
    mockApi({ 'GET /data/charities.json': [200, SNAPSHOT] as const })
    renderWithProviders(<RegisterPanel />, { route: '/registreties?pieprasit=cesu-bernu-nams' })
    expect(await screen.findByText('Šo profilu nevar pieprasīt')).toBeInTheDocument()
    expect(field(/^Nosaukums, kā to redzēs/)).toHaveValue('')
  })
})
