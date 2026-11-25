import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { fail, ok } from '../test/fetch'
import { ADMIN } from '../test/fixtures'
import { renderApp } from '../test/render'

const anonymous = { 'GET /api/auth/me': () => fail(401, 'unauthorized') }

const fillLogin = async (email: string, password: string) => {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('E-pasts'), email)
  await user.type(screen.getByLabelText('Parole'), password)
  await user.click(screen.getByRole('button', { name: 'Pieslēgties' }))
  return user
}

describe('login', () => {
  it('sends a logged-out visitor to the login page', async () => {
    renderApp('/organizacijas', anonymous)
    expect(await screen.findByRole('heading', { name: 'Pieslēgties' })).toBeInTheDocument()
  })

  it('asks for both fields before calling the API', async () => {
    const { calls } = renderApp('/pieslegties', anonymous)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Pieslēgties' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Ievadiet e-pastu un paroli.')
    expect(calls.some((c) => c.url === '/api/auth/login')).toBe(false)
  })

  it('shows wrong credentials', async () => {
    renderApp('/pieslegties', { ...anonymous, 'POST /api/auth/login': () => fail(401, 'unauthorized') })
    await fillLogin('admin@example.com', 'wrong-password')
    expect(await screen.findByRole('alert')).toHaveTextContent('Nepareizs e-pasts vai parole.')
  })

  it('refuses a charity account and logs it straight out', async () => {
    const { calls } = renderApp('/pieslegties', {
      ...anonymous,
      'POST /api/auth/login': () => ok({ email: 'org@x.lv', role: 'charity', charityId: 'c1' }),
      'POST /api/auth/logout': () => ok({}),
    })
    await fillLogin('org@x.lv', 'dev-password-123')
    expect(await screen.findByRole('alert')).toHaveTextContent('Šim kontam nav administratora tiesību')
    expect(calls.some((c) => c.url === '/api/auth/logout')).toBe(true)
  })

  it('shows a network failure with its own copy', async () => {
    renderApp('/pieslegties', { ...anonymous, 'POST /api/auth/login': () => Promise.reject(new TypeError('offline')) })
    await fillLogin('admin@example.com', 'dev-password-123')
    expect(await screen.findByRole('alert')).toHaveTextContent(/interneta savienojumu/)
  })

  it('logs an admin in, returns to where they were going, and logs out', async () => {
    const { calls } = renderApp('/abonenti', {
      ...anonymous,
      'POST /api/auth/login': () => ok(ADMIN),
      'POST /api/auth/logout': () => ok({}),
      'GET /api/admin/subscribers': () => ok([]),
    })
    const user = await fillLogin('admin@example.com', 'dev-password-123')
    expect(await screen.findByRole('heading', { name: 'Abonenti' })).toBeInTheDocument()
    expect(calls.find((c) => c.url === '/api/auth/login')?.body).toEqual({ email: 'admin@example.com', password: 'dev-password-123' })
    await user.click(screen.getByRole('button', { name: 'Iziet' }))
    expect(await screen.findByText('Jūs esat izgājis no sistēmas.')).toBeInTheDocument()
  })

  it('sends an expired session to the login page with a message', async () => {
    renderApp('/abonenti', { 'GET /api/admin/subscribers': () => fail(401, 'unauthorized') })
    expect(await screen.findByText('Sesija ir beigusies. Lūdzu, pieslēdzieties vēlreiz.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pieslēgties' })).toBeInTheDocument()
  })
})

describe('set password', () => {
  it('needs a token', async () => {
    renderApp('/parole', anonymous)
    expect(await screen.findByRole('alert')).toHaveTextContent('Saitei trūkst žetona')
  })

  it('checks length and match, then logs the admin in', async () => {
    const { calls } = renderApp('/parole?token=abc', { ...anonymous, 'POST /api/auth/set-password': () => ok(ADMIN) })
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Jaunā parole'), 'short')
    await user.click(screen.getByRole('button', { name: 'Saglabāt paroli' }))
    expect(screen.getByRole('alert')).toHaveTextContent('vismaz 10')
    await user.clear(screen.getByLabelText('Jaunā parole'))
    await user.type(screen.getByLabelText('Jaunā parole'), 'long-enough-1')
    await user.type(screen.getByLabelText('Parole vēlreiz'), 'long-enough-2')
    await user.click(screen.getByRole('button', { name: 'Saglabāt paroli' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Paroles nesakrīt.')
    await user.clear(screen.getByLabelText('Parole vēlreiz'))
    await user.type(screen.getByLabelText('Parole vēlreiz'), 'long-enough-1')
    await user.click(screen.getByRole('button', { name: 'Saglabāt paroli' }))
    expect(await screen.findByRole('heading', { name: 'Pārskats' })).toBeInTheDocument()
    expect(calls.find((c) => c.url === '/api/auth/set-password')?.body).toEqual({ token: 'abc', password: 'long-enough-1' })
  })

  it('explains a used or expired link, and refuses a charity account', async () => {
    let role = 'none'
    renderApp('/parole?token=old', {
      ...anonymous,
      'POST /api/auth/set-password': () =>
        role === 'none' ? fail(400, 'token_invalid') : ok({ email: 'o@x.lv', role: 'charity' }),
    })
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Jaunā parole'), 'long-enough-1')
    await user.type(screen.getByLabelText('Parole vēlreiz'), 'long-enough-1')
    await user.click(screen.getByRole('button', { name: 'Saglabāt paroli' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Saite vairs nav derīga')
    role = 'charity'
    await user.click(screen.getByRole('button', { name: 'Saglabāt paroli' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('nav administratora tiesību'))
  })
})
