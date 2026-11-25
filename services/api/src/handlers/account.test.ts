import { describe, expect, it } from 'vitest'
import { asAdmin, asCharity, call, data, errorOf, putAccount, validProfile, world } from '../test/helpers'

describe('charity account', () => {
  it('shows the dashboard with stats and subscribers', async () => {
    const w = world()
    const { cookie } = await asCharity(w)
    await call(w.app, 'POST', '/charities/c1/view')
    await call(w.app, 'POST', '/subscribe', { body: { email: 's@b.lv', consent: true, charityId: 'c1' } })
    const view = data(await call(w.app, 'GET', '/account', { cookie }))
    expect(view).toMatchObject({ id: 'c1', slug: 'kepa', status: 'approved', stats: { views: 1, pledges: 0, subscribers: 1 } })
    expect(view.pendingUpdate).toBeUndefined()
    expect(view.profile.contactPerson.firstName).toBe('Anna')
  })

  it('turns a profile save into a pending update, leaving the live profile alone', async () => {
    const w = world()
    const { cookie } = await asCharity(w)
    const proposed = { ...validProfile(), description: 'Jauns apraksts' }
    const view = data(await call(w.app, 'PUT', '/account/profile', { cookie, body: proposed }))
    expect(view.profile.description).toBe('Rūpējamies par suņiem un kaķiem.')
    expect(view.pendingUpdate).toMatchObject({ profile: { description: 'Jauns apraksts' }, submittedAt: '2026-11-25T10:00:00.000Z' })
    const notice = w.deps.mailer.sent().find((m) => m.to === 'notify@hagroup.lv')
    expect(notice?.subject).toBe('Profila izmaiņas: Dzīvnieku patversme Ķepa')
  })

  it('validates the profile', async () => {
    const w = world()
    const { cookie } = await asCharity(w)
    const res = await call(w.app, 'PUT', '/account/profile', { cookie, body: { ...validProfile(), needs: [] } })
    expect(errorOf(res)).toEqual({ status: 400, error: 'validation', fields: { needs: 'required' } })
  })

  it('lists pledges without emails', async () => {
    const w = world()
    const { cookie } = await asCharity(w)
    await call(w.app, 'POST', '/charities/c1/pledges', {
      body: { needs: ['sausa-bariba-kakiem'], anonymous: false, name: 'Ilze', email: 'ilze@b.lv', subscribe: false, consent: true },
    })
    const list = data(await call(w.app, 'GET', '/account/pledges', { cookie }))
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ name: 'Ilze', needs: ['sausa-bariba-kakiem'] })
    expect(list[0]).not.toHaveProperty('email')
  })

  it('creates a list request and reports when it was last asked', async () => {
    const w = world()
    const { cookie } = await asCharity(w)
    const r = data(await call(w.app, 'POST', '/account/list-request', { cookie, body: { message: '  Lūdzu līdz piektdienai ' } }))
    expect(r).toMatchObject({ charityId: 'c1', charityName: 'Dzīvnieku patversme Ķepa', message: 'Lūdzu līdz piektdienai', status: 'open' })
    expect(data(await call(w.app, 'POST', '/account/list-request', { cookie }))).not.toHaveProperty('message')
    expect(data(await call(w.app, 'GET', '/account', { cookie })).lastListRequestAt).toBe('2026-11-25T10:00:00.000Z')
    expect(errorOf(await call(w.app, 'POST', '/account/list-request', { cookie, body: { message: 5 } })).fields).toEqual({ message: 'invalid' })
    const long = 'x'.repeat(501)
    expect(errorOf(await call(w.app, 'POST', '/account/list-request', { cookie, body: { message: long } })).fields).toEqual({ message: 'too_long' })
  })

  it('needs a charity session', async () => {
    const w = world()
    expect(errorOf(await call(w.app, 'GET', '/account')).status).toBe(401)
    const admin = await asAdmin(w)
    expect(errorOf(await call(w.app, 'GET', '/account', { cookie: admin })).status).toBe(403)
  })

  it('refuses a charity account without a charity id, or whose charity is gone', async () => {
    const w = world()
    await putAccount(w.deps, { email: 'loose@b.lv', role: 'charity' })
    expect(errorOf(await call(w.app, 'GET', '/account', { cookie: await w.login('loose@b.lv') })).status).toBe(403)
    await putAccount(w.deps, { email: 'orphan@b.lv', role: 'charity', charityId: 'gone' })
    expect(errorOf(await call(w.app, 'GET', '/account', { cookie: await w.login('orphan@b.lv') })).status).toBe(404)
  })
})
