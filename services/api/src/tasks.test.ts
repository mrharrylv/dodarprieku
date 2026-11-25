import { describe, expect, it } from 'vitest'
import { createLambdaHandler } from './lambda'
import { silentLogger } from './log'
import { isTaskEvent, runTask } from './tasks'
import { call, createTestDeps, data, putAccount, putCharity, world } from './test/helpers'
import { createApp } from './app'

describe('invite-admin task', () => {
  it('creates an admin and emails a link to the admin host that sets the password', async () => {
    const deps = createTestDeps()
    const res = await runTask(deps, { task: 'invite-admin', email: ' Harry@HAGroup.lv ' })
    expect(res).toEqual({ ok: true, data: { email: 'harry@hagroup.lv', created: true, mailSent: true } })
    expect(await deps.repo.getAccount('harry@hagroup.lv')).toMatchObject({ role: 'admin', sessionVersion: 0 })
    const mail = deps.mailer.sent()[0]!
    const token = /admin\.dodarprieku\.hagroup\.lv\/parole\?token=([\w-]+)/.exec(mail.text)?.[1]
    expect(token).toBeTruthy()
    const app = createApp(deps)
    const set = await call(app, 'POST', '/auth/set-password', { body: { token, password: 'admin-parole-123' } })
    expect(data(set)).toEqual({ email: 'harry@hagroup.lv', role: 'admin' })
  })

  it('re-invites an existing admin, refuses charity emails and bad input', async () => {
    const deps = createTestDeps()
    await putAccount(deps, { email: 'a@hagroup.lv', role: 'admin', sessionVersion: 3 })
    expect(await runTask(deps, { task: 'invite-admin', email: 'a@hagroup.lv' })).toMatchObject({ ok: true, data: { created: false } })
    expect((await deps.repo.getAccount('a@hagroup.lv'))?.sessionVersion).toBe(3)
    await putAccount(deps, { email: 'c@b.lv', role: 'charity', charityId: 'c1' })
    expect(await runTask(deps, { task: 'invite-admin', email: 'c@b.lv' })).toMatchObject({ ok: false })
    expect(await runTask(deps, { task: 'invite-admin', email: 'nope' })).toEqual({ ok: false, error: 'invalid email' })
    expect(await runTask(deps, { task: 'invite-admin' })).toEqual({ ok: false, error: 'invalid email' })
  })
})

describe('other tasks', () => {
  it('rebuilds the snapshot', async () => {
    const deps = createTestDeps()
    await putCharity(deps)
    expect(await runTask(deps, { task: 'rebuild-snapshot' })).toEqual({ ok: true, data: { written: true } })
    expect(deps.storage.keys()).toEqual(['data/charities.json'])
  })

  it('reports a failed snapshot, an unknown task and a crash', async () => {
    const deps = createTestDeps()
    const broken = { ...deps, storage: { ...deps.storage, put: async () => { throw new Error('s3 down') } } }
    expect(await runTask(broken, { task: 'rebuild-snapshot' })).toEqual({ ok: false, error: 'snapshot failed' })
    expect(await runTask(deps, { task: 'dance' })).toEqual({ ok: false, error: 'unknown task' })
    const crashing = { ...deps, repo: { ...deps.repo, getAccount: async () => { throw new Error('ddb down') } } }
    expect(await runTask(crashing, { task: 'invite-admin', email: 'a@b.lv' })).toEqual({ ok: false, error: 'task failed' })
  })

  it('tells task events from HTTP events', () => {
    expect(isTaskEvent({ task: 'x' })).toBe(true)
    expect(isTaskEvent({ task: 'x', requestContext: {} })).toBe(false)
    expect(isTaskEvent(null)).toBe(false)
  })
})

describe('lambda handler', () => {
  const httpEvent = {
    version: '2.0',
    rawPath: '/api/auth/me',
    headers: {},
    requestContext: { http: { method: 'GET', path: '/api/auth/me', sourceIp: '1.2.3.4' }, requestId: 'r' },
    isBase64Encoded: false,
  }

  it('routes HTTP events through the app', async () => {
    const w = world()
    const handler = createLambdaHandler(async () => w.deps, silentLogger)
    const res = (await handler(httpEvent)) as { statusCode: number; body: string }
    expect(res.statusCode).toBe(401)
    expect(JSON.parse(res.body)).toEqual({ ok: false, error: 'unauthorized' })
  })

  it('runs tasks and refuses unknown events', async () => {
    const w = world()
    const handler = createLambdaHandler(async () => w.deps, silentLogger)
    expect(await handler({ task: 'rebuild-snapshot' })).toEqual({ ok: true, data: { written: true } })
    expect(await handler({ hello: 1 })).toEqual({ ok: false, error: 'unknown event' })
  })

  it('answers 500 (HTTP) or an error (task) when the cold start fails', async () => {
    const handler = createLambdaHandler(async () => { throw new Error('no config') }, silentLogger)
    expect(await handler(httpEvent)).toMatchObject({ statusCode: 500 })
    expect(await handler({ task: 'rebuild-snapshot' })).toEqual({ ok: false, error: 'cold start failed' })
  })
})
