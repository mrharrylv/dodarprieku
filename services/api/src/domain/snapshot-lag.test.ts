/**
 * The status index (GSI1) is eventually consistent: a query straight after a
 * write can still return the record as it was. The snapshot must still show
 * the write it was published for.
 */
import { describe, expect, it } from 'vitest'
import type { PublicSnapshot } from '../../../shared/src/contracts'
import { createApp } from '../app'
import type { CharityRecord } from '../repo/types'
import { asAdmin, call, cookieToken, createTestDeps, data, PASSWORD, putCharity, validProfile, type TestDeps, type World } from '../test/helpers'

/** Deps whose listCharities answers from a copy taken at `freeze()`, as a lagging index would. */
const laggingWorld = (): World & { freeze: () => Promise<void> } => {
  const base = createTestDeps()
  let frozen: readonly CharityRecord[] | undefined
  const deps: TestDeps = {
    ...base,
    repo: {
      ...base.repo,
      listCharities: async (status) =>
        frozen ? frozen.filter((c) => status === undefined || c.status === status) : base.repo.listCharities(status),
    },
  }
  const app = createApp(deps)
  return {
    deps,
    app,
    login: async (email, password = PASSWORD) =>
      cookieToken(await call(app, 'POST', '/auth/login', { body: { email, password } })),
    freeze: async () => {
      frozen = await base.repo.listCharities()
    },
  }
}

const snapshot = async (w: World): Promise<PublicSnapshot> => {
  const o = await w.deps.storage.get('data/charities.json')
  if (!o) throw new Error('no snapshot')
  return JSON.parse(Buffer.from(o.body).toString('utf8')) as PublicSnapshot
}

const ids = async (w: World): Promise<string[]> => (await snapshot(w)).charities.map((c) => c.id)

const setup = async (status: CharityRecord['status'], over: Partial<CharityRecord> = {}) => {
  const w = laggingWorld()
  const admin = await asAdmin(w)
  await putCharity(w.deps, { status, ...over })
  await w.freeze()
  return { w, admin }
}

describe('snapshot behind a lagging status index', () => {
  it('shows a charity approved a moment ago', async () => {
    const { w, admin } = await setup('pending')
    data(await call(w.app, 'POST', '/admin/charities/c1/approve', { cookie: admin }))
    expect(await ids(w)).toEqual(['c1'])
  })

  it('drops a charity suspended a moment ago, and shows it again once restored', async () => {
    const { w, admin } = await setup('approved')
    data(await call(w.app, 'POST', '/admin/charities/c1/suspend', { cookie: admin }))
    expect(await ids(w)).toEqual([])
    await w.freeze()
    data(await call(w.app, 'POST', '/admin/charities/c1/restore', { cookie: admin }))
    expect(await ids(w)).toEqual(['c1'])
  })

  it('carries an admin edit and an approved update, not the profile before them', async () => {
    const { w, admin } = await setup('approved')
    data(await call(w.app, 'PUT', '/admin/charities/c1/profile', { cookie: admin, body: validProfile({ description: 'Admin' }) }))
    expect((await snapshot(w)).charities[0]?.profile.description).toBe('Admin')
    await w.freeze()
    await w.deps.repo.putUpdate({ charityId: 'c1', profile: validProfile({ description: 'Jauns' }), submittedAt: 'x' })
    data(await call(w.app, 'POST', '/admin/charities/c1/update/approve', { cookie: admin }))
    expect((await snapshot(w)).charities[0]?.profile.description).toBe('Jauns')
  })

  it('drops a charity deleted a moment ago', async () => {
    const { w, admin } = await setup('approved')
    data(await call(w.app, 'DELETE', '/admin/charities/c1', { cookie: admin }))
    expect(await ids(w)).toEqual([])
  })

  it('no longer offers a claim on a charity whose claim was approved a moment ago', async () => {
    const imported = { id: 'imp-1', slug: 'ulubele', accountEmail: '', source: 'import:charity-map-2026-11-25' }
    const { w, admin } = await setup('approved', imported)
    const body = { profile: validProfile(), accountEmail: 'a@kepa.lv', acceptTerms: true, claimCharityId: 'imp-1' }
    const claim = data(await call(w.app, 'POST', '/applications', { body }))
    await w.freeze()
    data(await call(w.app, 'POST', `/admin/charities/${claim.id}/approve`, { cookie: admin }))
    const snap = await snapshot(w)
    expect(snap.charities.map((c) => c.id)).toEqual(['imp-1'])
    expect(snap.charities[0]?.claimable).toBeUndefined()
  })
})
