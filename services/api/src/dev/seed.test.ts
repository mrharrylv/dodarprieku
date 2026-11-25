import { describe, expect, it } from 'vitest'
import type { PublicSnapshot } from '../../../shared/src/contracts'
import { createApp } from '../app'
import { silentLogger } from '../log'
import { sniffContentType } from '../domain/upload'
import { call, cookieToken, data } from '../test/helpers'
import { createLocalDeps } from './local'
import { solidPng } from './png'
import { DEV_ADMIN_EMAIL, DEV_CHARITY_EMAIL, DEV_PASSWORD, seedDev } from './seed'

const seeded = async () => {
  const deps = { ...createLocalDeps({}, () => undefined), log: silentLogger }
  await seedDev(deps)
  return deps
}

describe('dev seed', () => {
  it('publishes six approved charities in six cities, with a shared sponsor', async () => {
    const deps = await seeded()
    const o = await deps.storage.get('data/charities.json')
    const snap = JSON.parse(Buffer.from(o!.body).toString('utf8')) as PublicSnapshot
    expect(snap.charities).toHaveLength(6)
    expect(new Set(snap.charities.map((c) => c.profile.address.city))).toEqual(
      new Set(['Rīga', 'Jelgava', 'Liepāja', 'Daugavpils', 'Valmiera', 'Cēsis']),
    )
    expect(new Set(snap.charities.map((c) => c.profile.category)).size).toBe(6)
    expect(snap.sponsorLeaderboard[0]!.charities).toBeGreaterThanOrEqual(3)
    expect(await deps.repo.listCharities('pending')).toHaveLength(2)
    for (const c of snap.charities) {
      const photo = await deps.storage.get(`media/${c.profile.photos[0]}`)
      expect(sniffContentType(photo!.body)).toBe('image/png')
    }
  })

  it('lets the dev admin and charity log in over plain http', async () => {
    const deps = await seeded()
    const app = createApp(deps)
    const admin = await call(app, 'POST', '/auth/login', { body: { email: DEV_ADMIN_EMAIL, password: DEV_PASSWORD } })
    expect(admin.cookies?.[0]).not.toContain('Secure')
    expect(data(await call(app, 'GET', '/admin/charities', { cookie: cookieToken(admin) }))).toHaveLength(8)
    const charity = await call(app, 'POST', '/auth/login', { body: { email: DEV_CHARITY_EMAIL, password: DEV_PASSWORD } })
    const view = data(await call(app, 'GET', '/account', { cookie: cookieToken(charity) }))
    expect(view.stats.pledges).toBe(3)
    expect(view.stats.subscribers).toBe(1)
  })

  it('draws valid PNGs', () => {
    const png = solidPng(2, 2, [1, 2, 3])
    expect(sniffContentType(png)).toBe('image/png')
  })
})
