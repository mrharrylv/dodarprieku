/** An imported charity has accountEmail '': no path may create an account for it or mail ''. */
import { describe, expect, it } from 'vitest'
import { sendMail } from '../domain/effects'
import { importCharities } from '../domain/import'
import { approvalEmail } from '../mail/templates'
import { asAdmin, call, data, errorOf, validProfile, world } from '../test/helpers'
import { importedItem } from '../test/imported'
import { sendCharityInvite } from './admin-common'

const ID = 'imp-L0001'

const setup = async () => {
  const w = world()
  const admin = await asAdmin(w)
  await importCharities(w.deps, w.deps.log, [importedItem(1)])
  return { w, admin }
}

const noAccountNoMail = async (w: Awaited<ReturnType<typeof setup>>['w']) => {
  expect(await w.deps.repo.getAccount('')).toBeUndefined()
  expect(w.deps.mailer.sent().map((m) => m.to).filter((to) => to.trim() === '')).toEqual([])
}

describe('mail to an empty address', () => {
  it('sendMail skips it without calling the mailer', async () => {
    const w = world()
    const links = { publicOrigin: 'https://a', adminOrigin: 'https://b', contactEmail: 'c@d.lv' }
    expect(await sendMail(w.deps, w.deps.log, '', approvalEmail(links, 'X', 't'))).toBe(false)
    expect(await sendMail(w.deps, w.deps.log, '  ', approvalEmail(links, 'X', 't'))).toBe(false)
    expect(w.deps.mailer.sent()).toEqual([])
    expect(w.deps.logs.some((l) => l.includes('mail skipped'))).toBe(true)
  })

  it('sendCharityInvite creates no token for a charity without an account email', async () => {
    const { w } = await setup()
    const c = (await w.deps.repo.getCharity(ID))!
    expect(await sendCharityInvite(w.deps, w.deps.log, c)).toBe(false)
    expect(w.deps.repo.tokenCount()).toBe(0)
  })
})

describe('admin flows on an imported charity', () => {
  it('lists and shows it without looking up an account', async () => {
    const { w, admin } = await setup()
    let lookups = 0
    const getAccount = w.deps.repo.getAccount
    Object.assign(w.deps.repo, { getAccount: async (email: string) => { if (email === '') lookups += 1; return getAccount(email) } })
    const list = data(await call(w.app, 'GET', '/admin/charities', { cookie: admin }))
    expect(list).toEqual([expect.objectContaining({ id: ID, accountEmail: '', passwordSet: false, status: 'approved' })])
    expect(data(await call(w.app, 'GET', `/admin/charities/${ID}`, { cookie: admin }))).toMatchObject({ id: ID, accountEmail: '' })
    expect(lookups).toBe(0)
  })

  it('refuses resend-invite with a clear field error', async () => {
    const { w, admin } = await setup()
    const res = await call(w.app, 'POST', `/admin/charities/${ID}/resend-invite`, { cookie: admin })
    expect(errorOf(res)).toEqual({ status: 400, error: 'validation', fields: { accountEmail: 'required' } })
    await noAccountNoMail(w)
  })

  it('suspends, restores and deletes it without mail', async () => {
    const { w, admin } = await setup()
    expect(data(await call(w.app, 'POST', `/admin/charities/${ID}/suspend`, { cookie: admin, body: {} }))).toMatchObject({ status: 'suspended' })
    expect(data(await call(w.app, 'POST', `/admin/charities/${ID}/restore`, { cookie: admin }))).toMatchObject({ status: 'approved' })
    expect(data(await call(w.app, 'DELETE', `/admin/charities/${ID}`, { cookie: admin }))).toEqual({})
    expect(await w.deps.repo.getCharity(ID)).toBeUndefined()
    await noAccountNoMail(w)
  })

  it('approves and rejects without creating an account for "" or mailing it', async () => {
    const { w, admin } = await setup()
    const c = (await w.deps.repo.getCharity(ID))!
    await w.deps.repo.saveCharity({ ...c, status: 'pending' })
    const rejected = data(await call(w.app, 'POST', `/admin/charities/${ID}/reject`, { cookie: admin, body: { reason: 'x' } }))
    expect(rejected).toMatchObject({ status: 'rejected', mailSent: false })
    const approved = data(await call(w.app, 'POST', `/admin/charities/${ID}/approve`, { cookie: admin }))
    expect(approved).toMatchObject({ status: 'approved', mailSent: false, snapshotWritten: true })
    await noAccountNoMail(w)
  })

  it('approves and rejects a pending update without mail', async () => {
    const { w, admin } = await setup()
    const put = () => w.deps.repo.putUpdate({ charityId: ID, profile: validProfile(), submittedAt: w.deps.now().toISOString() })
    await put()
    expect(data(await call(w.app, 'POST', `/admin/charities/${ID}/update/reject`, { cookie: admin, body: {} }))).toMatchObject({ mailSent: false })
    await put()
    expect(data(await call(w.app, 'POST', `/admin/charities/${ID}/update/approve`, { cookie: admin }))).toMatchObject({ mailSent: false })
    await noAccountNoMail(w)
  })
})
