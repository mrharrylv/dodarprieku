import { describe, expect, it } from 'vitest'
import { call, data, errorOf, putCharity, validProfile, world } from '../test/helpers'
import { pledgedLabels } from './public'

const pledge = (over: Record<string, unknown> = {}) => ({
  needs: ['sausa-bariba-kakiem'],
  anonymous: false,
  name: 'Jānis',
  email: 'Janis@Example.com',
  message: 'Atvedīšu sestdien',
  subscribe: true,
  consent: true,
  ...over,
})

describe('stats and views', () => {
  it('counts views and reports stats for an approved charity', async () => {
    const w = world()
    await putCharity(w.deps)
    expect(data(await call(w.app, 'POST', '/charities/c1/view'))).toEqual({})
    await call(w.app, 'POST', '/charities/c1/view')
    const stats = data(await call(w.app, 'GET', '/charities/c1/stats'))
    expect(stats).toEqual({ views: 2, pledges: 0, pledgesByNeed: {}, recentSupporters: [] })
  })

  it('answers 404 for unknown or unpublished charities', async () => {
    const w = world()
    await putCharity(w.deps, { status: 'pending' })
    expect(errorOf(await call(w.app, 'GET', '/charities/c1/stats'))).toEqual({ status: 404, error: 'not_found' })
    expect(errorOf(await call(w.app, 'POST', '/charities/zzz/view')).status).toBe(404)
  })
})

describe('pledges', () => {
  it('records a pledge, counts it, subscribes and thanks by email', async () => {
    const w = world()
    await putCharity(w.deps)
    const res = await call(w.app, 'POST', '/charities/c1/pledges', { body: pledge({ needs: ['sausa-bariba-kakiem', 'custom:1'] }) })
    expect(data(res).id).toMatch(/^0{8}-/)
    const stats = data(await call(w.app, 'GET', '/charities/c1/stats'))
    expect(stats.pledges).toBe(1)
    expect(stats.pledgesByNeed).toEqual({ 'sausa-bariba-kakiem': 1, 'custom:1': 1 })
    expect(stats.recentSupporters).toEqual([{ name: 'Jānis', at: '2026-11-25T10:00:00.000Z' }])
    const subs = await w.deps.repo.listSubscribers()
    expect(subs).toEqual([{ email: 'janis@example.com', name: 'Jānis', charityIds: ['c1'], createdAt: '2026-11-25T10:00:00.000Z' }])
    const [mail] = w.deps.mailer.sent()
    expect(mail?.to).toBe('janis@example.com')
    expect(mail?.text).toContain('Sausā barība kaķiem')
    expect(mail?.text).toContain('Veca avīze')
    expect(mail?.text).toContain('https://dodarprieku.hagroup.lv/organizacija/kepa')
  })

  it('stays anonymous without email: no name stored, no mail', async () => {
    const w = world()
    await putCharity(w.deps)
    data(await call(w.app, 'POST', '/charities/c1/pledges', {
      body: { needs: ['sausa-bariba-kakiem'], anonymous: true, name: 'Slepens', subscribe: false, consent: false },
    }))
    const [p] = await w.deps.repo.listPledges('c1')
    expect(p).not.toHaveProperty('name')
    expect(p).not.toHaveProperty('email')
    expect(w.deps.mailer.sent()).toHaveLength(0)
    expect(data(await call(w.app, 'GET', '/charities/c1/stats')).recentSupporters).toEqual([])
  })

  it('keeps the pledge when the thank-you mail fails', async () => {
    const w = world()
    await putCharity(w.deps)
    w.deps.mailer.failNext()
    expect(data(await call(w.app, 'POST', '/charities/c1/pledges', { body: pledge({ subscribe: false }) })).id).toBeTruthy()
    expect(await w.deps.repo.listPledges('c1')).toHaveLength(1)
    expect(w.deps.logs.some((l) => l.includes('mail failed') && !l.includes('janis@example.com'))).toBe(true)
  })

  it('refuses needs the charity does not list, with field errors', async () => {
    const w = world()
    await putCharity(w.deps)
    const res = await call(w.app, 'POST', '/charities/c1/pledges', { body: pledge({ needs: ['zelts'] }) })
    expect(errorOf(res)).toEqual({ status: 400, error: 'validation', fields: { needs: 'invalid' } })
  })

  it('pretends success on a filled honeypot and stores nothing', async () => {
    const w = world()
    await putCharity(w.deps)
    expect(data(await call(w.app, 'POST', '/charities/c1/pledges', { body: pledge({ website: 'spam' }) })).id).toBeTruthy()
    expect(await w.deps.repo.listPledges()).toHaveLength(0)
  })

  it('rate limits 20 per hour per ip', async () => {
    const w = world()
    await putCharity(w.deps)
    for (let i = 0; i < 20; i += 1) {
      await call(w.app, 'POST', '/charities/c1/pledges', { body: pledge({ email: undefined, subscribe: false, consent: false }) })
    }
    const res = await call(w.app, 'POST', '/charities/c1/pledges', { body: pledge() })
    expect(errorOf(res)).toEqual({ status: 429, error: 'rate_limited' })
    expect((await call(w.app, 'POST', '/charities/c1/pledges', { body: pledge(), ip: '198.51.100.1' })).status).toBe(200)
  })

  it('labels unknown keys by their key', () => {
    expect(pledgedLabels(validProfile(), ['sausa-bariba-kakiem', 'nope'])).toEqual(['Sausā barība kaķiem', 'nope'])
  })
})

describe('subscribe', () => {
  it('is idempotent and merges charity ids', async () => {
    const w = world()
    await putCharity(w.deps)
    await putCharity(w.deps, { id: 'c2', slug: 'otra' })
    const body = { email: 'liga@example.com', consent: true, charityId: 'c1' }
    data(await call(w.app, 'POST', '/subscribe', { body }))
    data(await call(w.app, 'POST', '/subscribe', { body }))
    data(await call(w.app, 'POST', '/subscribe', { body: { ...body, charityId: 'c2', name: 'Līga' } }))
    data(await call(w.app, 'POST', '/subscribe', { body: { email: 'liga@example.com', consent: true } }))
    expect(await w.deps.repo.listSubscribers()).toEqual([
      { email: 'liga@example.com', name: 'Līga', charityIds: ['c1', 'c2'], createdAt: '2026-11-25T10:00:00.000Z' },
    ])
    expect(await w.deps.repo.countCharitySubscribers('c1')).toBe(1)
  })

  it('needs consent and a valid email, and a published charity', async () => {
    const w = world()
    await putCharity(w.deps, { status: 'suspended' })
    expect(errorOf(await call(w.app, 'POST', '/subscribe', { body: { email: 'x', consent: false } })).fields).toEqual({
      email: 'invalid', consent: 'required',
    })
    const res = await call(w.app, 'POST', '/subscribe', { body: { email: 'a@b.lv', consent: true, charityId: 'c1' } })
    expect(errorOf(res)).toEqual({ status: 400, error: 'validation', fields: { charityId: 'invalid' } })
  })

  it('silently drops honeypot submissions', async () => {
    const w = world()
    data(await call(w.app, 'POST', '/subscribe', { body: { email: 'a@b.lv', consent: true, website: 'x' } }))
    expect(await w.deps.repo.listSubscribers()).toEqual([])
  })
})
