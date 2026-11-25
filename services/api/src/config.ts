/**
 * Configuration from the environment, validated once at cold start. A Lambda
 * with a missing or malformed value fails loudly on its first invocation
 * instead of half-working.
 */

export interface AppConfig {
  readonly tableName: string
  readonly mediaBucket: string
  readonly publicOrigin: string
  readonly adminOrigin: string
  readonly mailFrom: string
  readonly sessionSecretParam: string
  /** Empty when no admin notifications are wanted. */
  readonly adminNotifyEmailParam: string
  readonly environment: string
  /** Plain-http local development: cookies lose `Secure`, localhost origins are allowed. */
  readonly isLocal: boolean
}

export class ConfigError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`Invalid configuration: ${problems.join('; ')}`)
    this.name = 'ConfigError'
  }
}

type Env = Readonly<Record<string, string | undefined>>

const LOCAL_ENVIRONMENT = 'local'

const isOrigin = (v: string, allowHttp: boolean): boolean => {
  try {
    const u = new URL(v)
    const okProtocol = u.protocol === 'https:' || (allowHttp && u.protocol === 'http:')
    return okProtocol && u.origin === v
  } catch {
    return false
  }
}

export const loadConfig = (env: Env): AppConfig => {
  const problems: string[] = []
  const read = (name: string, required = true): string => {
    const v = (env[name] ?? '').trim()
    if (required && v === '') problems.push(`${name} is required`)
    return v
  }
  const environment = read('ENVIRONMENT')
  const isLocal = environment === LOCAL_ENVIRONMENT
  const config: AppConfig = {
    tableName: read('TABLE_NAME'),
    mediaBucket: read('MEDIA_BUCKET'),
    publicOrigin: read('PUBLIC_ORIGIN'),
    adminOrigin: read('ADMIN_ORIGIN'),
    mailFrom: read('MAIL_FROM'),
    sessionSecretParam: read('SESSION_SECRET_PARAM'),
    adminNotifyEmailParam: read('ADMIN_NOTIFY_EMAIL_PARAM', false),
    environment,
    isLocal,
  }
  for (const name of ['publicOrigin', 'adminOrigin'] as const) {
    if (config[name] !== '' && !isOrigin(config[name], isLocal)) problems.push(`${name} must be an https origin`)
  }
  if (config.mailFrom !== '' && !/@/.test(config.mailFrom)) problems.push('MAIL_FROM must contain an address')
  if (problems.length > 0) throw new ConfigError(problems)
  return config
}

/** "Dodar prieku <info@hagroup.lv>" -> "info@hagroup.lv". */
export const addressOf = (mailFrom: string): string => {
  const m = /<([^>]+)>/.exec(mailFrom)
  return (m?.[1] ?? mailFrom).trim()
}

/** Origins a browser request may come from. */
export const isAllowedOrigin = (config: AppConfig, origin: string): boolean => {
  if (origin === config.publicOrigin || origin === config.adminOrigin) return true
  return config.isLocal && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
}
