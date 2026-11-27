/** Paging and batching helpers over the DynamoDB document client. */
import {
  BatchWriteCommand,
  QueryCommand,
  type DynamoDBDocumentClient,
  type QueryCommandInput,
} from '@aws-sdk/lib-dynamodb'

export type Item = Record<string, unknown>

export interface Db {
  readonly client: DynamoDBDocumentClient
  readonly table: string
}

/** Every page of a query, in order. */
export const queryAll = async (db: Db, input: Omit<QueryCommandInput, 'TableName'>): Promise<Item[]> => {
  const out: Item[] = []
  let start: Record<string, unknown> | undefined
  do {
    const res = await db.client.send(
      new QueryCommand({ ...input, TableName: db.table, ...(start ? { ExclusiveStartKey: start } : {}) }),
    )
    out.push(...((res.Items ?? []) as Item[]))
    start = res.LastEvaluatedKey
  } while (start)
  return out
}

const BATCH_SIZE = 25
const MAX_ATTEMPTS = 5

type WriteRequest = { DeleteRequest: { Key: Item } } | { PutRequest: { Item: Item } }

const BACKOFF_MS = 50
const pause = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/** Writes in batches of 25, retrying unprocessed requests with a growing pause between attempts. */
const batchWrite = async (db: Db, all: readonly WriteRequest[], what: string): Promise<void> => {
  for (let i = 0; i < all.length; i += BATCH_SIZE) {
    let requests = all.slice(i, i + BATCH_SIZE)
    for (let attempt = 0; requests.length > 0; attempt += 1) {
      if (attempt >= MAX_ATTEMPTS) throw new Error(`batch ${what}: unprocessed items remain`)
      if (attempt > 0) await pause(BACKOFF_MS * 2 ** (attempt - 1))
      const res = await db.client.send(new BatchWriteCommand({ RequestItems: { [db.table]: [...requests] } }))
      requests = (res.UnprocessedItems?.[db.table] ?? []) as WriteRequest[]
    }
  }
}

/** Deletes keys in batches of 25, retrying unprocessed ones. */
export const batchDelete = (db: Db, itemKeys: readonly { PK: string; SK: string }[]): Promise<void> =>
  batchWrite(db, itemKeys.map((Key) => ({ DeleteRequest: { Key } })), 'delete')

export const isConditionalFailure = (err: unknown): boolean =>
  err instanceof Error && err.name === 'ConditionalCheckFailedException'
