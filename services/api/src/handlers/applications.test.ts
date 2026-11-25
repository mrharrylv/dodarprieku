import { describe, expect, it } from 'vitest'
import { LIMITS } from '../../../shared/src/contracts'
import { call, data, errorOf, putAccount, putCharity, validProfile, world } from '../test/helpers'

const application = (over: Record<string, unknown> = {}) => ({
  profile: validProfile(),
  accountEmail: 'Owner@Kepa.Example.com',
  acceptTerms: true,
  ...over,
})

describe('POST /applications', () => {
  it('stores a pending charity with a unique slug and notifies the admin', async () => {
    const w = world()
    await putCharity(w.deps, { id: 'old', slug: 'dzivnieku-patversme-kepa' })
    const { id } = data(await call(w.app, 'POST', '/applications', { body: application() }))
    const c = await w.deps.repo.getCharity(id)
    expect(c).toMatchObject({ status: 'pending', slug: 'dzivnieku-patversme-kepa-2', accountEmail: 'owner@kepa.example.com', views: 0 })
    const [mail] = w.deps.mailer.sent()
    expect(mail?.to).toBe('notify@hagroup.lv')
    expect(mail?.subject).toBe('Jauns pieteikums: Dzīvnieku patversme Ķepa')
    expect(mail?.text).toContain(`https://admin.dodarprieku.hagroup.lv/pieteikumi/${id}`)
  })

  it('sends no notification when none is configured', async () => {
    const w = world({ notify: false })
    data(await call(w.app, 'POST', '/applications', { body: application() }))
    expect(w.deps.mailer.sent()).toHaveLength(0)
  })

  it('returns prefixed field errors', async () => {
    const w = world()
    const res = await call(w.app, 'POST', '/applications', {
      body: application({ acceptTerms: false, profile: { ...validProfile(), description: '' } }),
    })
    expect(errorOf(res)).toEqual({
      status: 400, error: 'validation', fields: { acceptTerms: 'required', 'profile.description': 'required' },
    })
  })

  it('refuses an email that already has an account', async () => {
    const w = world()
    await putAccount(w.deps, { email: 'owner@kepa.example.com', role: 'charity', charityId: 'x' })
    expect(errorOf(await call(w.app, 'POST', '/applications', { body: application() }))).toEqual({ status: 409, error: 'conflict' })
  })

  it('drops honeypot submissions', async () => {
    const w = world()
    data(await call(w.app, 'POST', '/applications', { body: application({ website: 'http://spam' }) }))
    expect(await w.deps.repo.listCharities()).toHaveLength(0)
  })

  it('rate limits 5 per hour', async () => {
    const w = world()
    for (let i = 0; i < 5; i += 1) await call(w.app, 'POST', '/applications', { body: {} })
    expect(errorOf(await call(w.app, 'POST', '/applications', { body: application() })).status).toBe(429)
  })
})

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4])

describe('POST /uploads', () => {
  it('stores the image under media/uploads/YYYY/MM with an immutable cache header', async () => {
    const w = world()
    const res = data(await call(w.app, 'POST', '/uploads', {
      body: { kind: 'photo', contentType: 'image/png', dataBase64: PNG.toString('base64') },
    }))
    expect(res.key).toMatch(/^uploads\/2026\/11\/[0-9a-f-]{36}\.png$/)
    expect(res.url).toBe(`/media/${res.key}`)
    const stored = await w.deps.storage.get(`media/${res.key}`)
    expect(stored?.contentType).toBe('image/png')
    expect(stored?.cacheControl).toBe('public, max-age=31536000, immutable')
    expect(Buffer.from(stored!.body).equals(PNG)).toBe(true)
  })

  it('refuses a content type that does not match the bytes', async () => {
    const w = world()
    const res = await call(w.app, 'POST', '/uploads', {
      body: { kind: 'logo', contentType: 'image/jpeg', dataBase64: PNG.toString('base64') },
    })
    expect(errorOf(res)).toEqual({ status: 400, error: 'validation', fields: { dataBase64: 'invalid' } })
  })

  it('refuses unknown kinds, types and a missing payload', async () => {
    const w = world()
    const res = await call(w.app, 'POST', '/uploads', { body: { kind: 'video', contentType: 'image/gif' } })
    expect(errorOf(res).fields).toEqual({ kind: 'invalid', contentType: 'invalid', dataBase64: 'required' })
  })

  it('answers 413 for an image over the limit', async () => {
    const w = world()
    const big = Buffer.concat([PNG, Buffer.alloc(LIMITS.uploadMaxBytes)]).toString('base64')
    const res = await call(w.app, 'POST', '/uploads', { body: { kind: 'photo', contentType: 'image/png', dataBase64: big } })
    expect(errorOf(res)).toEqual({ status: 413, error: 'too_large' })
  })
})
