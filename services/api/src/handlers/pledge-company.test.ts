import { describe, expect, it } from 'vitest'
import { LIMITS } from '../../../shared/src/contracts'
import { call, data, errorOf, putCharity, world } from '../test/helpers'

const pledge = (over: Record<string, unknown> = {}) => ({
  needs: ['sausa-bariba-kakiem'],
  anonymous: false,
  name: 'Jānis',
  company: 'SIA Labie Kaimiņi',
  subscribe: false,
  consent: false,
  ...over,
})

describe('pledge company', () => {
  it('stores the company with a named pledge and shows it among the supporters', async () => {
    const w = world()
    await putCharity(w.deps)
    data(await call(w.app, 'POST', '/charities/c1/pledges', { body: pledge() }))
    const [stored] = await w.deps.repo.listPledges('c1')
    expect(stored).toMatchObject({ name: 'Jānis', company: 'SIA Labie Kaimiņi' })
    const stats = data(await call(w.app, 'GET', '/charities/c1/stats'))
    expect(stats.recentSupporters).toEqual([{ name: 'Jānis', company: 'SIA Labie Kaimiņi', at: '2026-11-25T10:00:00.000Z' }])
  })

  it('drops the company of an anonymous pledge', async () => {
    const w = world()
    await putCharity(w.deps)
    data(await call(w.app, 'POST', '/charities/c1/pledges', { body: pledge({ anonymous: true, name: undefined }) }))
    const [stored] = await w.deps.repo.listPledges('c1')
    expect(stored?.company).toBeUndefined()
  })

  it('refuses a company over the limit', async () => {
    const w = world()
    await putCharity(w.deps)
    const res = await call(w.app, 'POST', '/charities/c1/pledges', { body: pledge({ company: 'x'.repeat(LIMITS.companyName + 1) }) })
    expect(errorOf(res).fields).toEqual({ company: 'too_long' })
  })
})

describe('pledge newsletter', () => {
  it('signs up for the organisation and the general newsletter at once', async () => {
    const w = world()
    await putCharity(w.deps)
    const body = pledge({ email: 'a@b.lv', subscribe: true, general: true, consent: true })
    data(await call(w.app, 'POST', '/charities/c1/pledges', { body }))
    expect(await w.deps.repo.listSubscribers()).toMatchObject([{ email: 'a@b.lv', charityIds: ['c1'], general: true }])
  })

  it('signs up for the general newsletter alone', async () => {
    const w = world()
    await putCharity(w.deps)
    data(await call(w.app, 'POST', '/charities/c1/pledges', { body: pledge({ email: 'a@b.lv', general: true, consent: true }) }))
    expect(await w.deps.repo.listSubscribers()).toMatchObject([{ email: 'a@b.lv', charityIds: [], general: true }])
  })

  it('needs an email and consent for the general newsletter', async () => {
    const w = world()
    await putCharity(w.deps)
    const res = await call(w.app, 'POST', '/charities/c1/pledges', { body: pledge({ general: true }) })
    expect(errorOf(res).fields).toEqual({ email: 'required', consent: 'required' })
    const bad = await call(w.app, 'POST', '/charities/c1/pledges', { body: pledge({ general: 'yes' }) })
    expect(errorOf(bad).fields).toEqual({ general: 'invalid' })
  })
})
