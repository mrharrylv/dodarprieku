import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { Repository } from '../types'
import { activityRepo } from './activity'
import { charityRepo } from './charities'
import type { Db } from './client'
import { peopleRepo } from './people'

export const createDocumentClient = (client: DynamoDBClient = new DynamoDBClient({})): DynamoDBDocumentClient =>
  DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } })

export const createDynamoRepository = (table: string, client: DynamoDBDocumentClient = createDocumentClient()): Repository => {
  const db: Db = { client, table }
  return { ...charityRepo(db), ...peopleRepo(db), ...activityRepo(db) }
}
