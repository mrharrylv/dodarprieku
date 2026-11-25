/** Test wiring: in-memory deps, a fixed clock, predictable ids and a request helper. */
import { CSRF_HEADER, CSRF_VALUE, SESSION_COOKIE, type CharityProfile } from '../../../shared/src/contracts'
import { createApp, type App } from '../app'
import { hashPassword } from '../auth/password'
import { loadConfig } from '../config'
import type { Deps } from '../deps'
import type { ApiRequest, ApiResult } from '../http/types'
import { createLogger } from '../log'
import { createMemoryMailer, type MemoryMailer } from '../mail/mailers'
import { createMemoryRepository, type MemoryRepository } from '../repo/memory'
import type { AccountRecord, CharityRecord } from '../repo/types'
import { createMemoryStorage, type MemoryStorage } from '../storage/memory'

export const PUBLIC_ORIGIN = 'https://dodarprieku.hagroup.lv'
export const ADMIN_ORIGIN = 'https://admin.dodarprieku.hagroup.lv'
export const SECRET = 'test-session-secret-0123456789abcdef'
export const PASSWORD = 'correct-horse-battery'

export interface TestDeps extends Deps {
  readonly repo: MemoryRepository
  readonly storage: MemoryStorage
  readonly mailer: MemoryMailer
  readonly logs: string[]
  /** Every pad `withFloor` asked for, in ms. */
  readonly sleeps: number[]
  readonly setNow: (iso: string) => void
}

export const testConfig = (overrides: Record<string, string> = {}) =>
  loadConfig({
    TABLE_NAME: 'table',
    MEDIA_BUCKET: 'bucket',
    PUBLIC_ORIGIN,
    ADMIN_ORIGIN,
    MAIL_FROM: 'Dod ar prieku <info@hagroup.lv>',
    SESSION_SECRET_PARAM: '/dev/dodarprieku/session-secret',
    ADMIN_NOTIFY_EMAIL_PARAM: '/dev/dodarprieku/admin-notify-email',
    ENVIRONMENT: 'dev',
    ...overrides,
  })

export const createTestDeps = (opts: { notify?: boolean; local?: boolean } = {}): TestDeps => {
  let now = new Date('2026-11-25T10:00:00.000Z')
  let seq = 0
  const logs: string[] = []
  const sleeps: number[] = []
  return {
    repo: createMemoryRepository(),
    storage: createMemoryStorage(),
    mailer: createMemoryMailer(),
    config: testConfig(opts.local ? { ENVIRONMENT: 'local' } : {}),
    secrets: { sessionSecret: SECRET, ...(opts.notify === false ? {} : { adminNotifyEmail: 'notify@hagroup.lv' }) },
    now: () => now,
    uuid: () => {
      seq += 1
      return `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`
    },
    log: createLogger({}, (line) => logs.push(line)),
    logs,
    sleeps,
    sleep: async (ms) => {
      sleeps.push(ms)
    },
    setNow: (iso) => {
      now = new Date(iso)
    },
  }
}

export interface Call {
  readonly body?: unknown
  readonly rawBody?: string
  readonly cookie?: string
  readonly headers?: Record<string, string>
  readonly query?: Record<string, string>
  readonly ip?: string
  readonly csrf?: boolean
}

export const call = (app: App, method: string, path: string, c: Call = {}): Promise<ApiResult> => {
  const mutating = method !== 'GET'
  const req: ApiRequest = {
    method,
    path,
    query: c.query ?? {},
    headers: {
      ...(mutating && c.csrf !== false ? { [CSRF_HEADER]: CSRF_VALUE } : {}),
      ...(c.headers ?? {}),
    },
    cookies: c.cookie ? { [SESSION_COOKIE]: c.cookie } : {},
    body: c.rawBody ?? (c.body === undefined ? '' : JSON.stringify(c.body)),
    ip: c.ip ?? '203.0.113.7',
    requestId: 'req-test',
  }
  return app(req)
}

export const data = <T = any>(r: ApiResult): T => {
  const body = r.body as { ok: boolean; data?: T; error?: string }
  if (!body.ok) throw new Error(`expected ok, got ${r.status} ${JSON.stringify(body)}`)
  return body.data as T
}

export const errorOf = (r: ApiResult): { status: number; error: string; fields?: Record<string, string> } => {
  const body = r.body as { ok: boolean; error: string; fields?: Record<string, string> }
  return { status: r.status, error: body.error, ...(body.fields ? { fields: body.fields } : {}) }
}

/** The token value from a Set-Cookie line. */
export const cookieToken = (r: ApiResult): string => {
  const line = r.cookies?.find((c) => c.startsWith(`${SESSION_COOKIE}=`))
  if (!line) throw new Error('no session cookie')
  return line.split(';')[0]!.slice(SESSION_COOKIE.length + 1)
}

export const validProfile = (overrides: Partial<CharityProfile> = {}): CharityProfile => ({
  organization: {
    name: 'Dzīvnieku patversme Ķepa',
    legalName: 'Biedrība "Ķepa"',
    regNumber: '40008100001',
    legalForm: 'biedriba',
    publicBenefit: true,
    email: 'info@kepa.example.com',
    phone: '+371 20000001',
  },
  contactPerson: { firstName: 'Anna', lastName: 'Bērziņa', email: 'anna@kepa.example.com', phone: '+371 21000001' },
  address: { street: 'Dzirciema iela 12', city: 'Rīga', postalCode: 'LV-1007' },
  location: { lat: 56.95, lng: 24.1 },
  category: 'dzivnieku-patversme',
  description: 'Rūpējamies par suņiem un kaķiem.',
  photos: ['uploads/2026/11/00000000-0000-4000-8000-000000000001.webp'],
  needs: [
    { itemId: 'sausa-bariba-kakiem', urgent: true, note: 'kaķēniem' },
    { itemId: 'custom', customLabel: 'Veca avīze', urgent: false },
  ],
  delivery: { inPerson: { address: 'Dzirciema iela 12, Rīga' }, parcelLockers: [] },
  sponsors: [{ name: 'SIA “Labie Kaimiņi”', logo: 'uploads/2026/11/00000000-0000-4000-8000-000000000002.png' }],
  ...overrides,
})

export const putAccount = async (deps: TestDeps, a: Partial<AccountRecord> & Pick<AccountRecord, 'email' | 'role'>) => {
  const account: AccountRecord = {
    sessionVersion: 0,
    createdAt: deps.now().toISOString(),
    updatedAt: deps.now().toISOString(),
    passwordHash: await hashPassword(PASSWORD),
    ...a,
  }
  await deps.repo.putAccount(account)
  return account
}

export const putCharity = async (deps: TestDeps, c: Partial<CharityRecord> = {}): Promise<CharityRecord> => {
  const record: CharityRecord = {
    id: 'c1',
    status: 'approved',
    slug: 'kepa',
    profile: validProfile(),
    accountEmail: 'owner@kepa.example.com',
    views: 0,
    pledges: 0,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    publishedAt: '2026-11-01T00:00:00.000Z',
    ...c,
  }
  await deps.repo.createCharity(record)
  await deps.repo.claimSlug(record.slug, record.id)
  return record
}

export interface World {
  readonly deps: TestDeps
  readonly app: App
  login: (email: string, password?: string) => Promise<string>
}

export const world = (opts: { notify?: boolean; local?: boolean } = {}): World => {
  const deps = createTestDeps(opts)
  const app = createApp(deps)
  return {
    deps,
    app,
    login: async (email, password = PASSWORD) => cookieToken(await call(app, 'POST', '/auth/login', { body: { email, password } })),
  }
}

/** An admin account and its session token. */
export const asAdmin = async (w: World): Promise<string> => {
  await putAccount(w.deps, { email: 'admin@hagroup.lv', role: 'admin' })
  return w.login('admin@hagroup.lv')
}

/** An approved charity with a password-set account, and its session token. */
export const asCharity = async (w: World, c: Partial<CharityRecord> = {}): Promise<{ charity: CharityRecord; cookie: string }> => {
  const charity = await putCharity(w.deps, c)
  await putAccount(w.deps, { email: charity.accountEmail, role: 'charity', charityId: charity.id })
  return { charity, cookie: await w.login(charity.accountEmail) }
}
