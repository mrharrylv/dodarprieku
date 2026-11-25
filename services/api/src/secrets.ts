/** SSM parameters, read once per container and cached. */
import { GetParameterCommand, type SSMClient } from '@aws-sdk/client-ssm'
import type { AppConfig } from './config'

export interface Secrets {
  readonly sessionSecret: string
  /** Undefined when notifications are off (no parameter, empty or "none"). */
  readonly adminNotifyEmail?: string
}

const MIN_SECRET_LENGTH = 32
const OFF_VALUES = new Set(['', 'none', '-'])

const getParameter = async (ssm: SSMClient, name: string, decrypt: boolean): Promise<string> => {
  const res = await ssm.send(new GetParameterCommand({ Name: name, WithDecryption: decrypt }))
  return (res.Parameter?.Value ?? '').trim()
}

export const parseNotifyEmail = (value: string): string | undefined => {
  const v = value.trim()
  return OFF_VALUES.has(v.toLowerCase()) || !v.includes('@') ? undefined : v
}

export const fetchSecrets = async (ssm: SSMClient, config: AppConfig): Promise<Secrets> => {
  const [sessionSecret, notify] = await Promise.all([
    getParameter(ssm, config.sessionSecretParam, true),
    config.adminNotifyEmailParam === '' ? Promise.resolve('') : getParameter(ssm, config.adminNotifyEmailParam, false),
  ])
  if (sessionSecret.length < MIN_SECRET_LENGTH) {
    throw new Error(`session secret parameter is shorter than ${MIN_SECRET_LENGTH} characters`)
  }
  const adminNotifyEmail = parseNotifyEmail(notify)
  return { sessionSecret, ...(adminNotifyEmail ? { adminNotifyEmail } : {}) }
}

/** Caches the first successful load; a failed load is retried on the next call. */
export const cacheOnce = <T>(load: () => Promise<T>): (() => Promise<T>) => {
  let pending: Promise<T> | undefined
  return () => {
    pending ??= load().catch((err: unknown) => {
      pending = undefined
      throw err
    })
    return pending
  }
}
