import { describe, expect, it } from 'vitest'
import type { PublicSnapshot } from '../../../shared/src/contracts'
import { asAdmin, asCharity, call, data, errorOf, putAccount, putCharity, validProfile, world, type World } from '../test/helpers'

const snapshot = async (w: World): Promise<PublicSnapshot> => {
  const o = await w.deps.storage.get('data/charities.json')
  if (!o) throw new Error('no snapshot')
  expect(o.cacheControl).toBe('public, max-age=60')
  return JSON.parse(Buffer.from(o.body).toString('utf8')) as PublicSnapshot
}

const setup = async (status: 'pending' | 'approved' | 'suspended' | 'rejected' = 'pending') => {
  const w = world()
  const admin = await asAdmin(w)
  await putCharity(w.deps, { status })
  return { w, admin }
}

describe('admin access', () => {
  it('refuses charities and anonymous visitors', async () => {
    const w = world()
    const { cookie } = await asCharity(w)
    expect(errorOf(await call(w.app, 'GET', '/admin/charities', { cookie })).status).toBe(403)
    expect(errorOf(await call(w.app, 'GET', '/admin/subscribers')).status).toBe(401)
  })
})

describe('list and detail', () => {
  it('lists summaries with filters, pending updates and password state', async () => {
    const { w, admin } = await setup('approved')
    await putCharity(w.deps, { id: 'c2', slug: 's2', status: 'pending', accountEmail: 'p@b.lv', createdAt: '2026-11-02T00:00:00.000Z' })
    await putAccount(w.deps, { email: 'owner@kepa.example.com', role: 'charity', charityId: 'c1' })
    await w.deps.repo.putUpdate({ charityId: 'c1', profile: validProfile(), submittedAt: 'x' })
    const all = data(await call(w.app, 'GET', '/admin/charities', { cookie: admin }))
    expect(all.map((c: { id: string }) => c.id)).toEqual(['c2', 'c1'])
    expect(all[1]).toMatchObject({ name: 'Dzīvnieku patversme Ķepa', city: 'Rīga', hasPendingUpdate: true, passwordSet: true })
    expect(all[0]).toMatchObject({ hasPendingUpdate: false, passwordSet: false })
    const pending = data(await call(w.app, 'GET', '/admin/charities', { cookie: admin, query: { status: 'pending' } }))
    expect(pending).toHaveLength(1)
    const bad = await call(w.app, 'GET', '/admin/charities', { cookie: admin, query: { status: 'gone' } })
    expect(errorOf(bad).fields).toEqual({ status: 'invalid' })
  })

  it('shows the detail with the pending update, or 404', async () => {
    const { w, admin } = await setup()
    await w.deps.repo.putUpdate({ charityId: 'c1', profile: validProfile(), submittedAt: 'x' })
    expect(data(await call(w.app, 'GET', '/admin/charities/c1', { cookie: admin })).pendingUpdate.submittedAt).toBe('x')
    expect(errorOf(await call(w.app, 'GET', '/admin/charities/nope', { cookie: admin })).status).toBe(404)
  })
})

describe('approve', () => {
  it('publishes, creates the account, emails a set-password link and writes the snapshot', async () => {
    const { w, admin } = await setup()
    const res = data(await call(w.app, 'POST', '/admin/charities/c1/approve', { cookie: admin }))
    expect(res).toMatchObject({ status: 'approved', mailSent: true, snapshotWritten: true, passwordSet: false })
    expect(await w.deps.repo.getAccount('owner@kepa.example.com')).toMatchObject({ role: 'charity', charityId: 'c1' })
    const mail = w.deps.mailer.sent().at(-1)!
    expect(mail.to).toBe('owner@kepa.example.com')
    const token = /konts\/parole\?token=([\w-]+)/.exec(mail.text)?.[1]
    expect(token).toBeTruthy()
    const snap = await snapshot(w)
    expect(snap.charities.map((c) => c.id)).toEqual(['c1'])
    expect(snap.charities[0]!.profile).not.toHaveProperty('contactPerson')
    expect(snap.sponsorLeaderboard).toEqual([
      { name: 'SIA “Labie Kaimiņi”', logo: 'uploads/2026/11/00000000-0000-4000-8000-000000000002.png', charities: 1 },
    ])
    const set = await call(w.app, 'POST', '/auth/set-password', { body: { token, password: 'jauna-parole-123' } })
    expect(data(set).charityId).toBe('c1')
  })

  it('keeps the approval when the email fails, and says so', async () => {
    const { w, admin } = await setup()
    w.deps.mailer.failNext()
    const res = data(await call(w.app, 'POST', '/admin/charities/c1/approve', { cookie: admin }))
    expect(res).toMatchObject({ status: 'approved', mailSent: false })
    expect((await w.deps.repo.getCharity('c1'))?.status).toBe('approved')
  })

  it('conflicts on an approved charity or a foreign account', async () => {
    const { w, admin } = await setup('approved')
    expect(errorOf(await call(w.app, 'POST', '/admin/charities/c1/approve', { cookie: admin })).status).toBe(409)
    await putCharity(w.deps, { id: 'c2', slug: 's2', status: 'rejected', accountEmail: 'admin@hagroup.lv', rejectReason: 'x' })
    expect(errorOf(await call(w.app, 'POST', '/admin/charities/c2/approve', { cookie: admin })).status).toBe(409)
  })

  it('re-approves a rejected charity and clears the reason', async () => {
    const { w, admin } = await setup('rejected')
    await putAccount(w.deps, { email: 'owner@kepa.example.com', role: 'charity', charityId: 'c1' })
    const res = data(await call(w.app, 'POST', '/admin/charities/c1/approve', { cookie: admin }))
    expect(res.rejectReason).toBeUndefined()
    expect(res.passwordSet).toBe(true)
  })
})

describe('reject, suspend, restore, resend', () => {
  it('rejects with a reason, emailed and escaped', async () => {
    const { w, admin } = await setup()
    const res = data(await call(w.app, 'POST', '/admin/charities/c1/reject', { cookie: admin, body: { reason: ' Nav <b>dokumentu</b> ' } }))
    expect(res).toMatchObject({ status: 'rejected', rejectReason: 'Nav <b>dokumentu</b>', mailSent: true })
    const mail = w.deps.mailer.sent().at(-1)!
    expect(mail.text).toContain('Iemesls: Nav <b>dokumentu</b>')
    expect(mail.html).toContain('Nav &lt;b&gt;dokumentu&lt;/b&gt;')
    expect(errorOf(await call(w.app, 'POST', '/admin/charities/c1/reject', { cookie: admin })).status).toBe(409)
  })

  it('validates the reason', async () => {
    const { w, admin } = await setup()
    const r1 = await call(w.app, 'POST', '/admin/charities/c1/reject', { cookie: admin, body: { reason: 4 } })
    expect(errorOf(r1).fields).toEqual({ reason: 'invalid' })
    const r2 = await call(w.app, 'POST', '/admin/charities/c1/reject', { cookie: admin, body: { reason: 'x'.repeat(501) } })
    expect(errorOf(r2).fields).toEqual({ reason: 'too_long' })
    const r3 = data(await call(w.app, 'POST', '/admin/charities/c1/reject', { cookie: admin, body: { reason: '  ' } }))
    expect(r3.rejectReason).toBeUndefined()
  })

  it('suspends (off the map) and restores (back on it)', async () => {
    const { w, admin } = await setup('approved')
    const s = data(await call(w.app, 'POST', '/admin/charities/c1/suspend', { cookie: admin, body: { reason: 'Pārbaude' } }))
    expect(s).toMatchObject({ status: 'suspended', suspendReason: 'Pārbaude' })
    expect((await snapshot(w)).charities).toHaveLength(0)
    expect(errorOf(await call(w.app, 'POST', '/admin/charities/c1/suspend', { cookie: admin })).status).toBe(409)
    const r = data(await call(w.app, 'POST', '/admin/charities/c1/restore', { cookie: admin }))
    expect(r.status).toBe('approved')
    expect(r.suspendReason).toBeUndefined()
    expect((await snapshot(w)).charities).toHaveLength(1)
    expect(errorOf(await call(w.app, 'POST', '/admin/charities/c1/restore', { cookie: admin })).status).toBe(409)
  })

  it('resends the invite only to an approved charity with its account', async () => {
    const { w, admin } = await setup('approved')
    expect(errorOf(await call(w.app, 'POST', '/admin/charities/c1/resend-invite', { cookie: admin })).status).toBe(409)
    await putAccount(w.deps, { email: 'owner@kepa.example.com', role: 'charity', charityId: 'c1' })
    expect(data(await call(w.app, 'POST', '/admin/charities/c1/resend-invite', { cookie: admin }))).toEqual({ mailSent: true })
    expect(w.deps.mailer.sent().at(-1)?.subject).toBe('Jūsu organizācija ir apstiprināta Dod ar prieku kartē')
    await putCharity(w.deps, { id: 'c2', slug: 's2', status: 'pending' })
    expect(errorOf(await call(w.app, 'POST', '/admin/charities/c2/resend-invite', { cookie: admin })).status).toBe(409)
  })
})

describe('updates', () => {
  const proposed = () => ({ ...validProfile(), description: 'Jauns', photos: ['uploads/2026/11/00000000-0000-4000-8000-000000000009.webp'] })

  it('approves a pending update: live profile replaced, old media removed, snapshot and mail', async () => {
    const { w, admin } = await setup('approved')
    await w.deps.storage.put('media/uploads/2026/11/00000000-0000-4000-8000-000000000001.webp', { body: new Uint8Array(1), contentType: 'image/webp', cacheControl: '' })
    await w.deps.repo.putUpdate({ charityId: 'c1', profile: proposed(), submittedAt: 'x' })
    const res = data(await call(w.app, 'POST', '/admin/charities/c1/update/approve', { cookie: admin }))
    expect(res).toMatchObject({ hasPendingUpdate: false, mailSent: true, profile: { description: 'Jauns' } })
    expect(w.deps.storage.keys()).toEqual(['data/charities.json'])
    expect((await snapshot(w)).charities[0]!.profile.description).toBe('Jauns')
    expect(w.deps.mailer.sent().at(-1)?.text).toContain('/organizacija/kepa')
    expect(errorOf(await call(w.app, 'POST', '/admin/charities/c1/update/approve', { cookie: admin })).status).toBe(409)
  })

  it('rejects a pending update with a reason and removes only its new media', async () => {
    const { w, admin } = await setup('approved')
    await w.deps.storage.put('media/uploads/2026/11/00000000-0000-4000-8000-000000000009.webp', { body: new Uint8Array(1), contentType: 'image/webp', cacheControl: '' })
    await w.deps.repo.putUpdate({ charityId: 'c1', profile: proposed(), submittedAt: 'x' })
    const res = data(await call(w.app, 'POST', '/admin/charities/c1/update/reject', { cookie: admin, body: { reason: 'Neskaidrs foto' } }))
    expect(res).toMatchObject({ hasPendingUpdate: false, mailSent: true, profile: { description: 'Rūpējamies par suņiem un kaķiem.' } })
    expect(w.deps.storage.keys()).toEqual([])
    expect(w.deps.mailer.sent().at(-1)?.text).toContain('Iemesls: Neskaidrs foto')
    expect(errorOf(await call(w.app, 'POST', '/admin/charities/c1/update/reject', { cookie: admin })).status).toBe(409)
  })
})

describe('admin edit and delete', () => {
  it('edits publish at once', async () => {
    const { w, admin } = await setup('approved')
    const res = data(await call(w.app, 'PUT', '/admin/charities/c1/profile', { cookie: admin, body: { ...validProfile(), description: 'Labots' } }))
    expect(res.profile.description).toBe('Labots')
    expect((await snapshot(w)).charities[0]!.profile.description).toBe('Labots')
    const bad = await call(w.app, 'PUT', '/admin/charities/c1/profile', { cookie: admin, body: {} })
    expect(errorOf(bad).error).toBe('validation')
  })

  it('deletes the charity, its media, pledges, slug and account', async () => {
    const w = world()
    const admin = await asAdmin(w)
    await asCharity(w)
    await w.deps.storage.put('media/uploads/2026/11/00000000-0000-4000-8000-000000000001.webp', { body: new Uint8Array(1), contentType: 'image/webp', cacheControl: '' })
    await call(w.app, 'POST', '/charities/c1/pledges', { body: { needs: ['sausa-bariba-kakiem'], anonymous: true, subscribe: false, consent: false } })
    await call(w.app, 'POST', '/subscribe', { body: { email: 's@b.lv', consent: true, charityId: 'c1' } })
    expect(data(await call(w.app, 'DELETE', '/admin/charities/c1', { cookie: admin }))).toEqual({})
    expect(await w.deps.repo.getCharity('c1')).toBeUndefined()
    expect(await w.deps.repo.listPledges()).toEqual([])
    expect(await w.deps.repo.getAccount('owner@kepa.example.com')).toBeUndefined()
    expect((await w.deps.repo.listSubscribers())[0]?.charityIds).toEqual([])
    expect(await w.deps.repo.claimSlug('kepa', 'new')).toBe(true)
    expect(w.deps.storage.keys()).toEqual(['data/charities.json'])
    expect((await snapshot(w)).charities).toHaveLength(0)
  })
})

describe('admin lists', () => {
  it('lists subscribers, pledges (with emails, filterable) and list requests', async () => {
    const w = world()
    const admin = await asAdmin(w)
    const { cookie } = await asCharity(w)
    await call(w.app, 'POST', '/charities/c1/pledges', {
      body: { needs: ['sausa-bariba-kakiem'], anonymous: false, name: 'Ilze', email: 'ilze@b.lv', subscribe: true, consent: true },
    })
    expect(data(await call(w.app, 'GET', '/admin/subscribers', { cookie: admin }))).toHaveLength(1)
    expect(data(await call(w.app, 'GET', '/admin/pledges', { cookie: admin }))[0].email).toBe('ilze@b.lv')
    expect(data(await call(w.app, 'GET', '/admin/pledges', { cookie: admin, query: { charityId: 'c1' } }))).toHaveLength(1)
    expect(data(await call(w.app, 'GET', '/admin/pledges', { cookie: admin, query: { charityId: 'c9' } }))).toHaveLength(0)
    const req = data(await call(w.app, 'POST', '/account/list-request', { cookie }))
    expect(data(await call(w.app, 'GET', '/admin/list-requests', { cookie: admin }))).toHaveLength(1)
    const done = data(await call(w.app, 'POST', `/admin/list-requests/c1/${req.id}/done`, { cookie: admin }))
    expect(done.status).toBe('done')
    expect((await w.deps.repo.listListRequests())[0]?.status).toBe('done')
    expect(errorOf(await call(w.app, 'POST', '/admin/list-requests/c1/nope/done', { cookie: admin })).status).toBe(404)
  })
})
