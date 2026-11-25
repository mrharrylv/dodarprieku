/** In-memory Deps for the dev server: same handlers, no AWS. */
import { randomUUID } from 'node:crypto'
import { loadConfig } from '../config'
import type { Deps } from '../deps'
import { createLogger, type LogSink } from '../log'
import { createMemoryMailer } from '../mail/mailers'
import type { Email } from '../mail/types'
import { createMemoryRepository } from '../repo/memory'
import { createMemoryStorage, type MemoryStorage } from '../storage/memory'

export const LOCAL_SESSION_SECRET = 'local-dev-session-secret-not-for-production'

export interface LocalDeps extends Deps {
  readonly storage: MemoryStorage
}

export const createLocalDeps = (
  env: Readonly<Record<string, string | undefined>>,
  printEmail: (email: Email) => void,
  sink?: LogSink,
): LocalDeps => {
  const config = loadConfig({
    TABLE_NAME: 'local',
    MEDIA_BUCKET: 'local',
    PUBLIC_ORIGIN: env.PUBLIC_ORIGIN ?? 'http://localhost:5173',
    ADMIN_ORIGIN: env.ADMIN_ORIGIN ?? 'http://localhost:5174',
    MAIL_FROM: 'Dodar prieku <info@hagroup.lv>',
    SESSION_SECRET_PARAM: 'local',
    ADMIN_NOTIFY_EMAIL_PARAM: '',
    ENVIRONMENT: 'local',
  })
  return {
    repo: createMemoryRepository(),
    storage: createMemoryStorage(),
    mailer: createMemoryMailer(printEmail),
    config,
    secrets: { sessionSecret: LOCAL_SESSION_SECRET, adminNotifyEmail: 'admin@example.com' },
    now: () => new Date(),
    uuid: randomUUID,
    log: createLogger({ service: 'dodarprieku-api', environment: 'local' }, sink),
  }
}
