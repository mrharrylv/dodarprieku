import { fireEvent, screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { LIMITS } from '@shared/contracts'

import { fail, mockApi, ok } from '@/components/profile-editor/fetch-mock'
import { renderWithProviders } from '@/test/render'
import { ForgotPasswordForm } from './ForgotPasswordForm'
import { COMMON_FAILURES, failureKey, formatDate, formatNumber } from './format'
import { passwordStrength, strengthLevel } from './password-strength'
import { SetPasswordForm } from './SetPasswordForm'

const GOOD = 'Ziema-2026-sniegs'

const renderSetPassword = (query: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/konts/parole" element={<SetPasswordForm />} />
      <Route path="/konts" element={<p>konta lapa</p>} />
    </Routes>,
    { route: `/konts/parole${query}` },
  )

describe('password strength', () => {
  it('grades passwords', () => {
    expect(passwordStrength('')).toBe('empty')
    expect(passwordStrength('a'.repeat(LIMITS.passwordMin - 1))).toBe('too_short')
    expect(passwordStrength('a'.repeat(LIMITS.passwordMin + 6))).toBe('weak')
    expect(passwordStrength('abcdefghij')).toBe('weak')
    expect(passwordStrength('abcdefghij12')).toBe('fair')
    expect(passwordStrength('Abcdefghij12')).toBe('good')
    expect(passwordStrength(GOOD)).toBe('strong')
    expect(strengthLevel('strong')).toBe(4)
    expect(strengthLevel('too_short')).toBe(0)
  })
})

describe('format helpers', () => {
  it('maps failures and formats Latvian dates and numbers', () => {
    expect(failureKey('timeout', COMMON_FAILURES)).toBe('timeout')
    expect(failureKey('conflict', COMMON_FAILURES)).toBe('generic')
    expect(formatDate('nav datums')).toBe('nav datums')
    expect(formatDate('2026-11-25T12:00:00Z')).toMatch(/2026/)
    expect(formatNumber(1234567)).toMatch(/1.234.567/)
  })
})

describe('SetPasswordForm', () => {
  it('sends the token with the new password, then opens the account', async () => {
    const api = mockApi({ 'POST /api/auth/set-password': ok({ email: 'a@b.lv', role: 'charity' }) })
    renderSetPassword('?token=abc123')
    expect(screen.queryAllByRole('heading', { level: 1 })).toHaveLength(0)
    fireEvent.change(screen.getByLabelText(/^Jaunā parole/), { target: { value: 'īsa' } })
    expect(screen.getByText(/Vēl par īsu/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Saglabāt paroli' }))
    expect(screen.getByText(`Parolei jābūt vismaz ${LIMITS.passwordMin} zīmes garai.`)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/^Jaunā parole/), { target: { value: GOOD } })
    expect(screen.getByText('Ļoti laba parole')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/^Atkārtojiet paroli/), { target: { value: `${GOOD}x` } })
    fireEvent.click(screen.getByRole('button', { name: 'Saglabāt paroli' }))
    expect(screen.getByText('Paroles nesakrīt.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/^Atkārtojiet paroli/), { target: { value: GOOD } })
    fireEvent.click(screen.getByRole('button', { name: 'Saglabāt paroli' }))
    expect(await screen.findByText('konta lapa')).toBeInTheDocument()
    expect(JSON.parse(String(api.mock.calls[0]?.[1]?.body))).toEqual({ token: 'abc123', password: GOOD })
  })

  it('explains a missing token and links to a new one', () => {
    renderSetPassword('')
    expect(screen.getByText('Saite vairs nav derīga')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pieprasīt jaunu saiti' })).toHaveAttribute('href', '/konts/aizmirsu')
  })

  it.each([
    [fail(400, 'token_invalid'), 'Saite vairs nav derīga'],
    [fail(404, 'not_found'), 'Saite vairs nav derīga'],
    [fail(429, 'rate_limited'), 'Pārāk daudz mēģinājumu īsā laikā. Lūdzu, pagaidiet un mēģiniet vēlreiz.'],
    ['network' as const, 'Neizdevās sazināties ar serveri. Pārbaudiet interneta savienojumu.'],
  ])('handles a failed request (%j)', async (reply, text) => {
    mockApi({ 'POST /api/auth/set-password': reply })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    renderSetPassword('?token=old')
    fireEvent.change(screen.getByLabelText(/^Jaunā parole/), { target: { value: GOOD } })
    fireEvent.change(screen.getByLabelText(/^Atkārtojiet paroli/), { target: { value: GOOD } })
    fireEvent.click(screen.getByRole('button', { name: 'Saglabāt paroli' }))
    expect(await screen.findByText(text)).toBeInTheDocument()
  })
})

describe('ForgotPasswordForm', () => {
  it('validates the email, then always gives the same neutral answer', async () => {
    const api = mockApi({ 'POST /api/auth/forgot': ok({}) })
    renderWithProviders(<ForgotPasswordForm />)
    fireEvent.click(screen.getByRole('button', { name: 'Nosūtīt saiti' }))
    expect(screen.getByText('Ierakstiet e-pastu.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/^E-pasts/), { target: { value: 'nav' } })
    fireEvent.click(screen.getByRole('button', { name: 'Nosūtīt saiti' }))
    expect(screen.getByText('Ievadiet derīgu e-pasta adresi.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/^E-pasts/), { target: { value: ' anna@ulubele.lv ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Nosūtīt saiti' }))
    expect(await screen.findByText('Pārbaudiet e-pastu')).toBeInTheDocument()
    expect(JSON.parse(String(api.mock.calls[0]?.[1]?.body))).toEqual({ email: 'anna@ulubele.lv' })
  })

  it('answers the same for an address the API did not like', async () => {
    mockApi({ 'POST /api/auth/forgot': fail(404, 'not_found') })
    renderWithProviders(<ForgotPasswordForm />)
    fireEvent.change(screen.getByLabelText(/^E-pasts/), { target: { value: 'kads@cits.lv' } })
    fireEvent.click(screen.getByRole('button', { name: 'Nosūtīt saiti' }))
    expect(await screen.findByText('Pārbaudiet e-pastu')).toBeInTheDocument()
  })

  it('says so when the request never got through', async () => {
    mockApi({ 'POST /api/auth/forgot': fail(429, 'rate_limited') })
    renderWithProviders(<ForgotPasswordForm />)
    fireEvent.change(screen.getByLabelText(/^E-pasts/), { target: { value: 'a@b.lv' } })
    fireEvent.click(screen.getByRole('button', { name: 'Nosūtīt saiti' }))
    expect(await screen.findByText('Saite nav nosūtīta. Mēģiniet vēlreiz.')).toBeInTheDocument()
  })
})
