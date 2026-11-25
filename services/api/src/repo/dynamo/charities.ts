import { DeleteCommand, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import type { CharityStatus } from '../../../../shared/src/contracts'
import type { CharityRecord, Repository, UpdateRecord } from '../types'
import { batchDelete, isConditionalFailure, queryAll, type Db, type Item } from './client'
import { GSI1, charityPk, gsi, keys, stripKeys } from './keys'

const STATUSES: readonly CharityStatus[] = ['pending', 'approved', 'rejected', 'suspended']
const OPTIONAL = ['rejectReason', 'suspendReason', 'publishedAt'] as const

const toCharity = (item: Item): CharityRecord => {
  const r = stripKeys(item)
  return { ...r, views: Number(r.views ?? 0), pledges: Number(r.pledges ?? 0) } as unknown as CharityRecord
}

const byNewest = (a: CharityRecord, b: CharityRecord): number => b.createdAt.localeCompare(a.createdAt)

type CharityRepo = Pick<
  Repository,
  | 'createCharity'
  | 'getCharity'
  | 'saveCharity'
  | 'listCharities'
  | 'deleteCharity'
  | 'incrementViews'
  | 'claimSlug'
  | 'releaseSlug'
  | 'getUpdate'
  | 'putUpdate'
  | 'deleteUpdate'
  | 'listUpdateIds'
>

/** SET every stored field, REMOVE the optional ones that are absent; counters are left alone. */
const saveExpression = (c: CharityRecord) => {
  const values: Record<string, unknown> = {
    ':status': c.status,
    ':slug': c.slug,
    ':profile': c.profile,
    ':accountEmail': c.accountEmail,
    ':createdAt': c.createdAt,
    ':updatedAt': c.updatedAt,
    ':gpk': gsi.status(c.status),
    ':gsk': c.createdAt,
    ':id': c.id,
  }
  const sets = [
    '#status = :status', 'slug = :slug', 'profile = :profile', 'accountEmail = :accountEmail',
    'createdAt = :createdAt', 'updatedAt = :updatedAt', 'GSI1PK = :gpk', 'GSI1SK = :gsk', 'id = :id',
  ]
  const removes: string[] = []
  for (const field of OPTIONAL) {
    const value = c[field]
    if (value === undefined) removes.push(field)
    else {
      sets.push(`${field} = :${field}`)
      values[`:${field}`] = value
    }
  }
  const expr = `SET ${sets.join(', ')}${removes.length > 0 ? ` REMOVE ${removes.join(', ')}` : ''}`
  return { UpdateExpression: expr, ExpressionAttributeValues: values }
}

export const charityRepo = (db: Db): CharityRepo => ({
  createCharity: async (c) => {
    await db.client.send(
      new PutCommand({
        TableName: db.table,
        Item: { ...keys.charity(c.id), GSI1PK: gsi.status(c.status), GSI1SK: c.createdAt, type: 'charity', ...c },
        ConditionExpression: 'attribute_not_exists(PK)',
      }),
    )
  },

  getCharity: async (id) => {
    const res = await db.client.send(new GetCommand({ TableName: db.table, Key: keys.charity(id) }))
    return res.Item ? toCharity(res.Item) : undefined
  },

  saveCharity: async (c) => {
    await db.client.send(
      new UpdateCommand({
        TableName: db.table,
        Key: keys.charity(c.id),
        ...saveExpression(c),
        ExpressionAttributeNames: { '#status': 'status' },
        ConditionExpression: 'attribute_exists(PK)',
      }),
    )
  },

  listCharities: async (status) => {
    const wanted = status ? [status] : STATUSES
    const pages = await Promise.all(
      wanted.map((s) =>
        queryAll(db, {
          IndexName: GSI1,
          KeyConditionExpression: 'GSI1PK = :pk',
          ExpressionAttributeValues: { ':pk': gsi.status(s) },
          ScanIndexForward: false,
        }),
      ),
    )
    return pages.flat().map(toCharity).sort(byNewest)
  },

  deleteCharity: async (id) => {
    const items = await queryAll(db, {
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': charityPk(id) },
      ProjectionExpression: 'PK, SK',
    })
    const subEmails = items.map((i) => String(i.SK)).filter((sk) => sk.startsWith('SUB#')).map((sk) => sk.slice(4))
    await Promise.all(
      subEmails.map((email) =>
        db.client.send(
          new UpdateCommand({
            TableName: db.table,
            Key: keys.subscriber(email),
            UpdateExpression: 'DELETE charityIds :ids',
            ExpressionAttributeValues: { ':ids': new Set([id]) },
          }),
        ),
      ),
    )
    await batchDelete(db, items.map((i) => ({ PK: String(i.PK), SK: String(i.SK) })))
  },

  incrementViews: async (id) => {
    try {
      await db.client.send(
        new UpdateCommand({
          TableName: db.table,
          Key: keys.charity(id),
          UpdateExpression: 'ADD #views :one',
          ExpressionAttributeNames: { '#views': 'views' },
          ExpressionAttributeValues: { ':one': 1 },
          ConditionExpression: 'attribute_exists(PK)',
        }),
      )
    } catch (err) {
      if (!isConditionalFailure(err)) throw err
    }
  },

  claimSlug: async (slug, charityId) => {
    try {
      await db.client.send(
        new PutCommand({
          TableName: db.table,
          Item: { ...keys.slug(slug), type: 'slug', charityId },
          ConditionExpression: 'attribute_not_exists(PK)',
        }),
      )
      return true
    } catch (err) {
      if (isConditionalFailure(err)) return false
      throw err
    }
  },

  releaseSlug: async (slug) => {
    await db.client.send(new DeleteCommand({ TableName: db.table, Key: keys.slug(slug) }))
  },

  getUpdate: async (id) => {
    const res = await db.client.send(new GetCommand({ TableName: db.table, Key: keys.update(id) }))
    return res.Item ? (stripKeys(res.Item) as unknown as UpdateRecord) : undefined
  },

  putUpdate: async (u) => {
    await db.client.send(
      new PutCommand({
        TableName: db.table,
        Item: { ...keys.update(u.charityId), GSI1PK: gsi.updates, GSI1SK: u.submittedAt, type: 'update', ...u },
      }),
    )
  },

  deleteUpdate: async (id) => {
    await db.client.send(new DeleteCommand({ TableName: db.table, Key: keys.update(id) }))
  },

  listUpdateIds: async () => {
    const items = await queryAll(db, {
      IndexName: GSI1,
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': gsi.updates },
    })
    return items.map((i) => String(i.charityId))
  },
})
