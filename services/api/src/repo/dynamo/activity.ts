import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import type { ListRequestRecord, PledgeRecord } from '../../../../shared/src/contracts'
import type { Repository } from '../types'
import { queryAll, type Db } from './client'
import { GSI1, charityPk, gsi, keys, stripKeys } from './keys'

type ActivityRepo = Pick<
  Repository,
  'recordPledge' | 'listPledges' | 'getNeedCounts' | 'putListRequest' | 'getListRequest' | 'listListRequests' | 'hitRateLimit'
>

const byNewest = <T extends { createdAt: string }>(a: T, b: T): number => b.createdAt.localeCompare(a.createdAt)

const PLEDGE_FIELDS = ['id', 'charityId', 'needs', 'anonymous', 'name', 'company', 'email', 'message', 'createdAt'] as const
const toPledge = (item: Record<string, unknown>): PledgeRecord =>
  Object.fromEntries(PLEDGE_FIELDS.filter((f) => item[f] !== undefined).map((f) => [f, item[f]])) as unknown as PledgeRecord

const byCharityPrefix = (db: Db, charityId: string, prefix: string) =>
  queryAll(db, {
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: { ':pk': charityPk(charityId), ':prefix': prefix },
    ScanIndexForward: false,
  })

const byGsi = (db: Db, pk: string) =>
  queryAll(db, {
    IndexName: GSI1,
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': pk },
    ScanIndexForward: false,
  })

/**
 * ADD only works on top-level attributes, so a per-need count is a SET on a
 * nested path; the map has to exist first, which the first update ensures.
 */
const addNeedCounts = async (db: Db, charityId: string, needKeys: readonly string[]): Promise<void> => {
  await db.client.send(
    new UpdateCommand({
      TableName: db.table,
      Key: keys.needCount(charityId),
      UpdateExpression: 'SET byNeed = if_not_exists(byNeed, :empty)',
      ExpressionAttributeValues: { ':empty': {} },
    }),
  )
  const names = Object.fromEntries(needKeys.map((k, i) => [`#k${i}`, k]))
  const sets = needKeys.map((_, i) => `byNeed.#k${i} = if_not_exists(byNeed.#k${i}, :zero) + :one`)
  await db.client.send(
    new UpdateCommand({
      TableName: db.table,
      Key: keys.needCount(charityId),
      UpdateExpression: `SET ${sets.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: { ':zero': 0, ':one': 1 },
    }),
  )
}

export const activityRepo = (db: Db): ActivityRepo => ({
  recordPledge: async (p) => {
    await db.client.send(
      new PutCommand({
        TableName: db.table,
        Item: { ...keys.pledge(p.charityId, p.createdAt, p.id), GSI1PK: gsi.pledges, GSI1SK: p.createdAt, type: 'pledge', ...p },
      }),
    )
    await db.client.send(
      new UpdateCommand({
        TableName: db.table,
        Key: keys.charity(p.charityId),
        UpdateExpression: 'ADD pledges :one',
        ExpressionAttributeValues: { ':one': 1 },
      }),
    )
    if (p.needs.length > 0) await addNeedCounts(db, p.charityId, p.needs)
  },

  listPledges: async (charityId) => {
    const items = charityId ? await byCharityPrefix(db, charityId, 'PLEDGE#') : await byGsi(db, gsi.pledges)
    return items.map(toPledge).sort(byNewest)
  },

  getNeedCounts: async (charityId) => {
    const res = await db.client.send(new GetCommand({ TableName: db.table, Key: keys.needCount(charityId) }))
    const byNeed = (res.Item?.byNeed ?? {}) as Record<string, unknown>
    return Object.fromEntries(Object.entries(byNeed).map(([k, v]) => [k, Number(v)]))
  },

  putListRequest: async (r) => {
    await db.client.send(
      new PutCommand({
        TableName: db.table,
        Item: { ...keys.listRequest(r.charityId, r.createdAt, r.id), GSI1PK: gsi.listRequests, GSI1SK: r.createdAt, type: 'list-request', ...r },
      }),
    )
  },

  getListRequest: async (charityId, id) => {
    const items = await byCharityPrefix(db, charityId, 'LISTREQ#')
    const found = items.find((i) => i.id === id)
    return found ? (stripKeys(found) as unknown as ListRequestRecord) : undefined
  },

  listListRequests: async (charityId) => {
    const items = charityId ? await byCharityPrefix(db, charityId, 'LISTREQ#') : await byGsi(db, gsi.listRequests)
    return items.map((i) => stripKeys(i) as unknown as ListRequestRecord).sort(byNewest)
  },

  hitRateLimit: async (key, window, expiresAt) => {
    const res = await db.client.send(
      new UpdateCommand({
        TableName: db.table,
        Key: keys.rate(key, window),
        UpdateExpression: 'ADD #count :one SET #ttl = :ttl',
        ExpressionAttributeNames: { '#count': 'count', '#ttl': 'ttl' },
        ExpressionAttributeValues: { ':one': 1, ':ttl': expiresAt },
        ReturnValues: 'UPDATED_NEW',
      }),
    )
    return Number(res.Attributes?.count ?? 1)
  },
})
