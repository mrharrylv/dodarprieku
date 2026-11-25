/** What every handler is given. Built once per container (index.ts) or per test. */
import type { AppConfig } from './config'
import type { Logger } from './log'
import type { Mailer } from './mail/types'
import type { Links } from './mail/templates'
import { addressOf } from './config'
import type { Repository } from './repo/types'
import type { Secrets } from './secrets'
import type { Storage } from './storage/types'

export interface Deps {
  readonly repo: Repository
  readonly storage: Storage
  readonly mailer: Mailer
  readonly config: AppConfig
  readonly secrets: Secrets
  readonly now: () => Date
  /** Random v4 UUIDs; injectable so tests can predict ids. */
  readonly uuid: () => string
  readonly log: Logger
  /** Waits `ms`; injectable so tests need not. Defaults to a real timer. */
  readonly sleep?: (ms: number) => Promise<void>
}

export const realSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/** Runs `work`, then pads the total to at least `floorMs`, so callers cannot time which path ran. */
export const withFloor = async <T>(deps: Deps, floorMs: number, work: () => Promise<T>): Promise<T> => {
  const started = Date.now()
  const result = await work()
  const left = floorMs - (Date.now() - started)
  if (left > 0) await (deps.sleep ?? realSleep)(left)
  return result
}

export const linksOf = (config: AppConfig): Links => ({
  publicOrigin: config.publicOrigin,
  adminOrigin: config.adminOrigin,
  contactEmail: addressOf(config.mailFrom),
})
