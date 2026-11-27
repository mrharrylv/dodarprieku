import { beforeEach, describe, expect, it } from 'vitest'
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm'
import { mockClient } from 'aws-sdk-client-mock'
import { ConfigError, addressOf, isAllowedOrigin, loadConfig } from './config'
import { createLogger, maskEmail, errorFields } from './log'
import { cacheOnce, fetchSecrets, parseNotifyEmail } from './secrets'
import { testConfig } from './test/helpers'

const ENV = {
  TABLE_NAME: 't',
  MEDIA_BUCKET: 'b',
  PUBLIC_ORIGIN: 'https://dodarprieku.hagroup.lv',
  ADMIN_ORIGIN: 'https://admin.dodarprieku.hagroup.lv',
  MAIL_FROM: 'Dod ar prieku <info@hagroup.lv>',
  SESSION_SECRET_PARAM: '/dev/dodarprieku/session-secret',
  ADMIN_NOTIFY_EMAIL_PARAM: '',
  ENVIRONMENT: 'dev',
  ORIGIN_VERIFY_HEADER: 'x-dodar-origin-verify',
  ORIGIN_VERIFY_SECRET: 's3cr3t',
}

describe('config', () => {
  it('loads a complete environment', () => {
    expect(loadConfig(ENV)).toMatchObject({ tableName: 't', isLocal: false, adminNotifyEmailParam: '' })
  })

  it('lists every problem at once', () => {
    try {
      loadConfig({ ...ENV, TABLE_NAME: '', PUBLIC_ORIGIN: 'http://dodarprieku.hagroup.lv', ADMIN_ORIGIN: 'https://x.lv/path', MAIL_FROM: 'nobody' })
      expect.fail('should throw')
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigError)
      expect((err as ConfigError).problems).toEqual([
        'TABLE_NAME is required',
        'publicOrigin must be an https origin',
        'adminOrigin must be an https origin',
        'MAIL_FROM must contain an address',
      ])
    }
    expect(() => loadConfig({ ...ENV, PUBLIC_ORIGIN: 'not a url' })).toThrow(ConfigError)
  })

  it('requires the origin-verify header and secret except locally', () => {
    expect(loadConfig(ENV)).toMatchObject({ originVerifyHeader: 'x-dodar-origin-verify', originVerifySecret: 's3cr3t' })
    try {
      loadConfig({ ...ENV, ORIGIN_VERIFY_HEADER: '', ORIGIN_VERIFY_SECRET: ' ' })
      expect.fail('should throw')
    } catch (err) {
      expect((err as ConfigError).problems).toEqual(['ORIGIN_VERIFY_HEADER is required', 'ORIGIN_VERIFY_SECRET is required'])
    }
    const local = loadConfig({ ...ENV, ENVIRONMENT: 'local', ORIGIN_VERIFY_HEADER: '', ORIGIN_VERIFY_SECRET: '' })
    expect(local).toMatchObject({ originVerifyHeader: '', originVerifySecret: '' })
    expect(loadConfig({ ...ENV, ORIGIN_VERIFY_HEADER: 'X-Dodar-Origin-Verify' }).originVerifyHeader).toBe('x-dodar-origin-verify')
  })

  it('allows http origins only locally', () => {
    expect(loadConfig({ ...ENV, ENVIRONMENT: 'local', PUBLIC_ORIGIN: 'http://localhost:5173' }).isLocal).toBe(true)
  })

  it('extracts the reply address', () => {
    expect(addressOf('Dod ar prieku <info@hagroup.lv>')).toBe('info@hagroup.lv')
    expect(addressOf(' info@hagroup.lv ')).toBe('info@hagroup.lv')
  })

  it('checks origins', () => {
    const c = testConfig()
    expect(isAllowedOrigin(c, 'https://dodarprieku.hagroup.lv')).toBe(true)
    expect(isAllowedOrigin(c, 'http://127.0.0.1:5173')).toBe(false)
    expect(isAllowedOrigin(testConfig({ ENVIRONMENT: 'local' }), 'http://127.0.0.1:5173')).toBe(true)
  })
})

const ssm = mockClient(SSMClient)
beforeEach(() => ssm.reset())

describe('secrets', () => {
  const secret = 'x'.repeat(40)

  it('reads the decrypted session secret and the notify address', async () => {
    ssm.on(GetParameterCommand, { Name: '/s' }).resolves({ Parameter: { Value: ` ${secret} ` } })
    ssm.on(GetParameterCommand, { Name: '/n' }).resolves({ Parameter: { Value: 'admin@hagroup.lv' } })
    const config = { ...loadConfig(ENV), sessionSecretParam: '/s', adminNotifyEmailParam: '/n' }
    expect(await fetchSecrets(new SSMClient({}), config)).toEqual({ sessionSecret: secret, adminNotifyEmail: 'admin@hagroup.lv' })
    expect(ssm.commandCalls(GetParameterCommand)[0]!.args[0].input).toEqual({ Name: '/s', WithDecryption: true })
  })

  it('skips the notify parameter when unset, and refuses a short secret', async () => {
    ssm.on(GetParameterCommand).resolves({ Parameter: { Value: secret } })
    const config = { ...loadConfig(ENV), sessionSecretParam: '/s' }
    expect(await fetchSecrets(new SSMClient({}), config)).toEqual({ sessionSecret: secret })
    expect(ssm.commandCalls(GetParameterCommand)).toHaveLength(1)
    ssm.on(GetParameterCommand).resolves({})
    await expect(fetchSecrets(new SSMClient({}), config)).rejects.toThrow(/shorter/)
  })

  it('treats empty, none and non-addresses as off', () => {
    expect(parseNotifyEmail('none')).toBeUndefined()
    expect(parseNotifyEmail(' NONE ')).toBeUndefined()
    expect(parseNotifyEmail('-')).toBeUndefined()
    expect(parseNotifyEmail('oops')).toBeUndefined()
    expect(parseNotifyEmail(' a@b.lv ')).toBe('a@b.lv')
  })

  it('caches the first success and retries after a failure', async () => {
    let calls = 0
    const load = cacheOnce(async () => {
      calls += 1
      if (calls === 1) throw new Error('first fails')
      return calls
    })
    await expect(load()).rejects.toThrow('first fails')
    expect(await load()).toBe(2)
    expect(await load()).toBe(2)
  })
})

describe('log', () => {
  it('writes JSON lines with base fields and children', () => {
    const lines: string[] = []
    const log = createLogger({ service: 's' }, (l) => lines.push(l)).child({ requestId: 'r' })
    log.info('a', { n: 1 })
    log.warn('b')
    log.error('c')
    expect(lines.map((l) => JSON.parse(l))).toMatchObject([
      { level: 'info', msg: 'a', service: 's', requestId: 'r', n: 1 },
      { level: 'warn', msg: 'b' },
      { level: 'error', msg: 'c' },
    ])
  })

  it('masks emails and describes errors', () => {
    expect(maskEmail('janis@example.com')).toBe('j***@example.com')
    expect(maskEmail('nope')).toBe('***')
    expect(errorFields(new TypeError('x'))).toEqual({ errorName: 'TypeError', errorMessage: 'x' })
    expect(errorFields('raw')).toEqual({ errorMessage: 'raw' })
  })
})
