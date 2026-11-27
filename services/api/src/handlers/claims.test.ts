import { describe, expect, it } from 'vitest'
import type { PublicSnapshot } from '../../../shared/src/contracts'
import { asAdmin, call, data, errorOf, putAccount, putCharity, validProfile, world, type World } from '../test/helpers'
import { CLAIM_TAKEN_REASON } from './admin-claims'

const IMPORTED = { id: 'imp-1', slug: 'ulubele', accountEmail: '', source: 'import:charity-map-2026-11-25', views: 7, pledges: 3 }

const claim = (email: string, over: Record<string, unknown> = {}) => ({
  profile: validProfile(),
  accountEmail: email,
  acceptTerms: true,
  claimCharityId: 'imp-1',
  ...over,
})

const snapshot = async (w: World): Promise<PublicSnapshot> => {
  const o = await w.deps.storage.get('data/charities.json')
  if (!o) throw new Error('no snapshot')
  return JSON.parse(Buffer.from(o.body).toString('utf8')) as PublicSnapshot
}

describe('claim applications', () => {
  it('stores a pending claim linked to the imported charity, and several may wait', async () => {
    const w = world()
    await putCharity(w.deps, IMPORTED)
    const a = data(await call(w.app, 'POST', '/applications', { body: claim('a@kepa.lv') }))
    const b = data(await call(w.app, 'POST', '/applications', { body: claim('b@kepa.lv') }))
    expect(await w.deps.repo.getCharity(a.id)).toMatchObject({ status: 'pending', claimCharityId: 'imp-1' })
    expect(await w.deps.repo.getCharity(b.id)).toMatchObject({ status: 'pending', claimCharityId: 'imp-1' })
    expect(w.deps.mailer.sent()[0]?.subject).toBe('Profila pieprasījums: Dzīvnieku patversme Ķepa')
    const imported = await w.deps.repo.getCharity('imp-1')
    expect(imported).toMatchObject({ source: IMPORTED.source, accountEmail: '' })
  })

  it('refuses a claim for a missing, unimported or claimed charity', async () => {
    const w = world()
    await putCharity(w.deps, { id: 'own', slug: 'own' })
    await putCharity(w.deps, { ...IMPORTED, id: 'imp-2', slug: 'x2', accountEmail: 'taken@b.lv' })
    await putCharity(w.deps, { ...IMPORTED, id: 'imp-3', slug: 'x3', status: 'suspended' })
    for (const id of ['nope', 'own', 'imp-2', 'imp-3']) {
      const res = await call(w.app, 'POST', '/applications', { body: claim('a@kepa.lv', { claimCharityId: id }) })
      expect(errorOf(res)).toEqual({ status: 400, error: 'validation', fields: { claimCharityId: 'invalid' } })
    }
    const long = await call(w.app, 'POST', '/applications', { body: claim('a@kepa.lv', { claimCharityId: 'x'.repeat(61) }) })
    expect(errorOf(long).fields).toEqual({ claimCharityId: 'too_long' })
  })

  it('marks the claim in the admin list and detail, with the imported profile to diff against', async () => {
    const w = world()
    const admin = await asAdmin(w)
    await putCharity(w.deps, { ...IMPORTED, profile: validProfile({ description: 'No reģistra.' }) })
    const { id } = data(await call(w.app, 'POST', '/applications', { body: claim('a@kepa.lv') }))
    const list = data(await call(w.app, 'GET', '/admin/charities', { cookie: admin, query: { status: 'pending' } }))
    expect(list[0].claim).toEqual({ charityId: 'imp-1', name: 'Dzīvnieku patversme Ķepa', slug: 'ulubele' })
    const detail = data(await call(w.app, 'GET', `/admin/charities/${id}`, { cookie: admin }))
    expect(detail.claimProfile.description).toBe('No reģistra.')
    expect(detail.profile.description).toBe('Rūpējamies par suņiem un kaķiem.')
  })
})

describe('approving a claim', () => {
  it('merges into the imported charity, keeps id, slug and counters, invites, rejects the others', async () => {
    const w = world()
    const admin = await asAdmin(w)
    await putCharity(w.deps, { ...IMPORTED, demoNeeds: true })
    const a = data(await call(w.app, 'POST', '/applications', { body: claim('a@kepa.lv') }))
    const b = data(await call(w.app, 'POST', '/applications', { body: claim('b@kepa.lv') }))
    // A claim reserves no slug of its own: it carries the target's.
    expect((await w.deps.repo.getCharity(a.id))?.slug).toBe('ulubele')
    expect(await w.deps.repo.claimSlug('dzivnieku-patversme-kepa', 'someone-else')).toBe(true)
    const res = data(await call(w.app, 'POST', `/admin/charities/${a.id}/approve`, { cookie: admin }))
    expect(res).toMatchObject({ id: 'imp-1', slug: 'ulubele', status: 'approved', accountEmail: 'a@kepa.lv', mailSent: true, snapshotWritten: true })

    const merged = await w.deps.repo.getCharity('imp-1')
    expect(merged).toMatchObject({ views: 7, pledges: 3, accountEmail: 'a@kepa.lv', claimedAt: '2026-11-25T10:00:00.000Z' })
    expect(merged?.source).toBeUndefined()
    expect(merged?.demoNeeds).toBeUndefined()
    expect(merged?.profile.description).toBe('Rūpējamies par suņiem un kaķiem.')
    expect(await w.deps.repo.getCharity(a.id)).toBeUndefined()
    expect(await w.deps.repo.claimSlug('ulubele', 'imp-1')).toBe(true)
    expect(await w.deps.repo.getAccount('a@kepa.lv')).toMatchObject({ role: 'charity', charityId: 'imp-1' })

    expect(await w.deps.repo.getCharity(b.id)).toMatchObject({ status: 'rejected', rejectReason: CLAIM_TAKEN_REASON })
    const mails = w.deps.mailer.sent()
    expect(mails.find((m) => m.to === 'b@kepa.lv')?.text).toContain(CLAIM_TAKEN_REASON)
    expect(mails.find((m) => m.to === 'a@kepa.lv')?.text).toMatch(/konts\/parole\?token=/)

    const snap = await snapshot(w)
    expect(snap.charities.find((c) => c.id === 'imp-1')?.claimable).toBeUndefined()
    // Claimed: a fresh claim is refused, and so is approving the rejected one.
    const again = await call(w.app, 'POST', '/applications', { body: claim('c@kepa.lv') })
    expect(errorOf(again).fields).toEqual({ claimCharityId: 'invalid' })
    expect(errorOf(await call(w.app, 'POST', `/admin/charities/${b.id}/approve`, { cookie: admin })).status).toBe(409)
  })

  it('refuses to merge into a charity suspended after the claim was filed, and mails nobody', async () => {
    const w = world()
    const admin = await asAdmin(w)
    await putCharity(w.deps, IMPORTED)
    const a = data(await call(w.app, 'POST', '/applications', { body: claim('a@kepa.lv') }))
    data(await call(w.app, 'POST', '/admin/charities/imp-1/suspend', { cookie: admin }))
    const sentBefore = w.deps.mailer.sent().length
    const res = await call(w.app, 'POST', `/admin/charities/${a.id}/approve`, { cookie: admin })
    expect(errorOf(res)).toEqual({ status: 409, error: 'conflict' })
    expect(await w.deps.repo.getCharity('imp-1')).toMatchObject({ status: 'suspended', accountEmail: '', source: IMPORTED.source })
    expect(await w.deps.repo.getCharity(a.id)).toMatchObject({ status: 'pending' })
    expect(w.deps.mailer.sent()).toHaveLength(sentBefore)
    // The repository refuses it too, whoever asks.
    const target = (await w.deps.repo.getCharity('imp-1'))!
    expect(await w.deps.repo.saveClaimMerge({ ...target, accountEmail: 'a@kepa.lv' })).toBe(false)
  })

  it('refuses when the claimant email got an account meanwhile', async () => {
    const w = world()
    const admin = await asAdmin(w)
    await putCharity(w.deps, IMPORTED)
    const a = data(await call(w.app, 'POST', '/applications', { body: claim('a@kepa.lv') }))
    await putAccount(w.deps, { email: 'a@kepa.lv', role: 'charity', charityId: 'other' })
    expect(errorOf(await call(w.app, 'POST', `/admin/charities/${a.id}/approve`, { cookie: admin })).status).toBe(409)
    expect((await w.deps.repo.getCharity('imp-1'))?.accountEmail).toBe('')
  })
})

describe('approving a claim, when things go wrong', () => {
  it('finishes the steps on a retry after the merge was written but a later step failed', async () => {
    const w = world()
    const admin = await asAdmin(w)
    await putCharity(w.deps, IMPORTED)
    const a = data(await call(w.app, 'POST', '/applications', { body: claim('a@kepa.lv') }))
    const b = data(await call(w.app, 'POST', '/applications', { body: claim('b@kepa.lv') }))
    const putAccountReal = w.deps.repo.putAccount
    Object.assign(w.deps.repo, { putAccount: async () => { throw new Error('throttled') } })
    expect(errorOf(await call(w.app, 'POST', `/admin/charities/${a.id}/approve`, { cookie: admin })).status).toBe(500)
    expect(await w.deps.repo.getCharity('imp-1')).toMatchObject({ accountEmail: 'a@kepa.lv' })
    expect(await w.deps.repo.getAccount('a@kepa.lv')).toBeUndefined()

    Object.assign(w.deps.repo, { putAccount: putAccountReal })
    const res = data(await call(w.app, 'POST', `/admin/charities/${a.id}/approve`, { cookie: admin }))
    expect(res).toMatchObject({ id: 'imp-1', accountEmail: 'a@kepa.lv', mailSent: true })
    expect(await w.deps.repo.getAccount('a@kepa.lv')).toMatchObject({ role: 'charity', charityId: 'imp-1' })
    expect(await w.deps.repo.getCharity(a.id)).toBeUndefined()
    expect(await w.deps.repo.getCharity(b.id)).toMatchObject({ status: 'rejected', rejectReason: CLAIM_TAKEN_REASON })
  })

  it('lets only one of two racing approvals write its merge', async () => {
    const w = world()
    const admin = await asAdmin(w)
    await putCharity(w.deps, IMPORTED)
    const a = data(await call(w.app, 'POST', '/applications', { body: claim('a@kepa.lv') }))
    const b = data(await call(w.app, 'POST', '/applications', { body: claim('b@kepa.lv') }))
    // Both approvals read the target while it is still claimable.
    const stale = (await w.deps.repo.getCharity('imp-1'))!
    const getCharityReal = w.deps.repo.getCharity
    Object.assign(w.deps.repo, { getCharity: async (id: string) => (id === 'imp-1' ? stale : getCharityReal(id)) })
    data(await call(w.app, 'POST', `/admin/charities/${a.id}/approve`, { cookie: admin }))
    const second = await call(w.app, 'POST', `/admin/charities/${b.id}/approve`, { cookie: admin })
    expect(errorOf(second).status).toBe(409)
    Object.assign(w.deps.repo, { getCharity: getCharityReal })
    expect(await w.deps.repo.getCharity('imp-1')).toMatchObject({ accountEmail: 'a@kepa.lv' })
    expect(await w.deps.repo.getAccount('b@kepa.lv')).toBeUndefined()
  })

  it('deleting a claim application leaves the target its slug', async () => {
    const w = world()
    const admin = await asAdmin(w)
    await putCharity(w.deps, IMPORTED)
    await w.deps.repo.claimSlug('ulubele', 'imp-1')
    const a = data(await call(w.app, 'POST', '/applications', { body: claim('a@kepa.lv') }))
    data(await call(w.app, 'DELETE', `/admin/charities/${a.id}`, { cookie: admin }))
    expect(await w.deps.repo.claimSlug('ulubele', 'someone-else')).toBe(false)
  })
})

describe('claimable in the snapshot', () => {
  it('is true only for imported charities without an account', async () => {
    const w = world()
    const admin = await asAdmin(w)
    await putCharity(w.deps, IMPORTED)
    await putCharity(w.deps, { id: 'own', slug: 'own' })
    await putCharity(w.deps, { id: 'p', slug: 'p', status: 'pending', accountEmail: 'p@b.lv' })
    data(await call(w.app, 'POST', '/admin/charities/p/approve', { cookie: admin }))
    const snap = await snapshot(w)
    expect(snap.charities.find((c) => c.id === 'imp-1')?.claimable).toBe(true)
    expect(snap.charities.find((c) => c.id === 'own')?.claimable).toBeUndefined()
    expect(snap.charities.find((c) => c.id === 'p')?.claimable).toBeUndefined()
  })
})
