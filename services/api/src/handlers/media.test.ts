import { describe, expect, it } from 'vitest'
import { createApp } from '../app'
import { removeMedia } from '../domain/effects'
import { asAdmin, call, data, errorOf, putCharity, validProfile, world } from '../test/helpers'

const KEY_B = 'uploads/2026/11/00000000-0000-4000-8000-0000000000bb.webp'
const KEY_A = 'uploads/2026/11/00000000-0000-4000-8000-0000000000aa.webp'
const blob = { body: new Uint8Array(1), contentType: 'image/webp', cacheControl: '' }

/** Charity c1 (the attacker) and c2 (the victim, live with KEY_B). */
const twoCharities = async () => {
  const w = world()
  const admin = await asAdmin(w)
  await putCharity(w.deps, { id: 'c1', slug: 'kepa', profile: { ...validProfile(), photos: [KEY_A] } })
  await putCharity(w.deps, { id: 'c2', slug: 'otra', accountEmail: 'b@b.lv', profile: { ...validProfile(), photos: [KEY_B] } })
  await w.deps.storage.put(`media/${KEY_A}`, blob)
  await w.deps.storage.put(`media/${KEY_B}`, blob)
  return { w, admin }
}

describe('media is never deleted while another record uses it', () => {
  it('rejecting an update that borrowed another charity key keeps that file', async () => {
    const { w, admin } = await twoCharities()
    await w.deps.repo.putUpdate({ charityId: 'c1', profile: { ...validProfile(), photos: [KEY_B] }, submittedAt: 'x' })
    await call(w.app, 'POST', '/admin/charities/c1/update/reject', { cookie: admin, body: { reason: 'Nē' } })
    expect(await w.deps.storage.get(`media/${KEY_B}`)).toBeDefined()
  })

  it('deleting a charity that borrowed another key removes only its own files', async () => {
    const { w, admin } = await twoCharities()
    await w.deps.repo.saveCharity({ ...(await w.deps.repo.getCharity('c1'))!, profile: { ...validProfile(), photos: [KEY_A, KEY_B] } })
    expect(data(await call(w.app, 'DELETE', '/admin/charities/c1', { cookie: admin }))).toEqual({})
    expect(await w.deps.storage.get(`media/${KEY_B}`)).toBeDefined()
    expect(await w.deps.storage.get(`media/${KEY_A}`)).toBeUndefined()
  })

  it('keeps a key another charity pending update uses', async () => {
    const { w } = await twoCharities()
    await w.deps.repo.putUpdate({ charityId: 'c2', profile: { ...validProfile(), photos: [KEY_A] }, submittedAt: 'x' })
    await removeMedia(w.deps, w.deps.log, [{ ...validProfile(), photos: [KEY_A] }])
    expect(await w.deps.storage.get(`media/${KEY_A}`)).toBeDefined()
  })

  it('deletes nothing when the references cannot be read', async () => {
    const { w } = await twoCharities()
    const repo = { ...w.deps.repo, listUpdateIds: async () => Promise.reject(new Error('down')) }
    await removeMedia({ ...w.deps, repo }, w.deps.log, [{ ...validProfile(), photos: ['uploads/2026/11/00000000-0000-4000-8000-0000000000cc.webp'] }])
    expect(w.deps.logs.join('\n')).toContain('media removal failed')
    expect(await w.deps.storage.get(`media/${KEY_A}`)).toBeDefined()
  })

  it('a failed database delete leaves the charity media in place', async () => {
    const { w } = await twoCharities()
    const repo = { ...w.deps.repo, deleteCharity: async () => Promise.reject(new Error('down')) }
    const deps = { ...w.deps, repo }
    const app = createApp(deps)
    const cookie = await w.login('admin@hagroup.lv')
    expect(errorOf(await call(app, 'DELETE', '/admin/charities/c1', { cookie })).status).toBe(500)
    expect(await w.deps.storage.get(`media/${KEY_A}`)).toBeDefined()
    expect(await w.deps.repo.getCharity('c1')).toBeDefined()
  })
})
