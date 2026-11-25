/** Lambda entry: real AWS clients, configuration validated at cold start. */
import { randomUUID } from 'node:crypto'
import { SSMClient } from '@aws-sdk/client-ssm'
import { loadConfig } from './config'
import type { Deps } from './deps'
import { createLambdaHandler } from './lambda'
import { createLogger } from './log'
import { createSesMailer } from './mail/mailers'
import { createDynamoRepository } from './repo/dynamo'
import { cacheOnce, fetchSecrets } from './secrets'
import { createS3Storage } from './storage/s3'

const log = createLogger({ service: 'dodarprieku-api' })

const buildDeps = async (): Promise<Deps> => {
  const config = loadConfig(process.env)
  const secrets = await fetchSecrets(new SSMClient({}), config)
  return {
    repo: createDynamoRepository(config.tableName),
    storage: createS3Storage(config.mediaBucket),
    mailer: createSesMailer(config.mailFrom),
    config,
    secrets,
    now: () => new Date(),
    uuid: randomUUID,
    log: log.child({ environment: config.environment }),
  }
}

export const handler = createLambdaHandler(cacheOnce(buildDeps), log)
