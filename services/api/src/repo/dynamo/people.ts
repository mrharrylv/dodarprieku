import { DeleteCommand, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import type { SubscriberRecord } from '../../../../shared/src/contracts'
import type { AccountRecord, Repository, TokenRecord } from '../types'
import { queryAll, type Db, type Item } from './client'
import { GSI1, charityPk, gsi, keys, stripKeys } from './keys'

type PeopleRepo = Pick<
  Repository,
  | 'getAccount'
  | 'putAccount'
  | 'deleteAccount'
  | 'putToken'
  | 'consumeToken'
  | 'upsertSubscriber'
  | 'listSubscribers'
  | 'countCharitySubscribers'
>

/**
 * A subscriber from before the general flag existed signed up either on the
 * map (no organisation: the general newsletter) or for an organisation only.
 */
const toSubscriber = (item: Item): SubscriberRecord => {
  const ids = item.charityIds instanceof Set ? [...(item.charityIds as Set<string>)] : []
  return {
    email: String(item.email),
    ...(typeof item.name === 'string' ? { name: item.name } : {}),
    charityIds: ids.sort(),
    general: typeof item.general === 'boolean' ? item.general : ids.length === 0,
    createdAt: String(item.createdAt),
  }
}

type SubscriberInput = Parameters<Repository['upsertSubscriber']>[0]

/**
 * The subscriber row update. True wins: an organisation-only sign-up never takes
 * the general newsletter away. With guardLegacy, the write fails on a row from
 * before the flag that has no organisation (read as general by toSubscriber), so
 * the caller can write general=true there instead of a silent false.
 */
const subscriberUpdate = (table: string, input: SubscriberInput, general: boolean, guardLegacy: boolean) => {
  const names: Record<string, string> = { '#source': 'source', '#general': 'general' }
  const values: Record<string, unknown> = {
    ':email': input.email,
    ':gpk': gsi.subscribers,
    ':now': input.consentAt,
    ':source': input.source,
    ':general': general,
  }
  const sets = [
    'email = :email',
    'GSI1PK = :gpk',
    'GSI1SK = if_not_exists(GSI1SK, :now)',
    'createdAt = if_not_exists(createdAt, :now)',
    'consentAt = :now',
    '#source = if_not_exists(#source, :source)',
    general ? '#general = :general' : '#general = if_not_exists(#general, :general)',
  ]
  if (input.name !== undefined) {
    sets.push('#name = :name')
    names['#name'] = 'name'
    values[':name'] = input.name
  }
  if (input.charityId !== undefined) values[':ids'] = new Set([input.charityId])
  const add = input.charityId !== undefined ? ' ADD charityIds :ids' : ''
  return {
    TableName: table,
    Key: keys.subscriber(input.email),
    UpdateExpression: `SET ${sets.join(', ')}${add}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ...(guardLegacy
      ? { ConditionExpression: 'attribute_not_exists(PK) OR attribute_exists(#general) OR attribute_exists(charityIds)' }
      : {}),
  }
}

export const peopleRepo = (db: Db): PeopleRepo => ({
  getAccount: async (email) => {
    const res = await db.client.send(new GetCommand({ TableName: db.table, Key: keys.account(email) }))
    return res.Item ? (stripKeys(res.Item) as unknown as AccountRecord) : undefined
  },

  putAccount: async (a) => {
    await db.client.send(
      new PutCommand({
        TableName: db.table,
        Item: { ...keys.account(a.email), GSI1PK: gsi.role(a.role), GSI1SK: a.email, type: 'account', ...a },
      }),
    )
  },

  deleteAccount: async (email) => {
    await db.client.send(new DeleteCommand({ TableName: db.table, Key: keys.account(email) }))
  },

  putToken: async (t) => {
    await db.client.send(
      new PutCommand({ TableName: db.table, Item: { ...keys.token(t.hash), type: 'token', ...t, ttl: t.expiresAt } }),
    )
  },

  consumeToken: async (hash) => {
    const res = await db.client.send(
      new DeleteCommand({ TableName: db.table, Key: keys.token(hash), ReturnValues: 'ALL_OLD' }),
    )
    return res.Attributes ? (stripKeys(res.Attributes) as unknown as TokenRecord) : undefined
  },

  upsertSubscriber: async (input) => {
    const update = (general: boolean, guardLegacy: boolean) =>
      db.client.send(new UpdateCommand(subscriberUpdate(db.table, input, general, guardLegacy)))
    if (input.general) {
      await update(true, false)
    } else {
      try {
        await update(false, true)
      } catch (err) {
        if ((err as { name?: string }).name !== 'ConditionalCheckFailedException') throw err
        // A row from before the flag with no organisation was a general subscriber: keep that.
        await update(true, false)
      }
    }
    if (input.charityId !== undefined) {
      await db.client.send(
        new PutCommand({
          TableName: db.table,
          Item: { ...keys.charitySub(input.charityId, input.email), type: 'charity-sub', at: input.consentAt },
        }),
      )
    }
  },

  listSubscribers: async () => {
    const items = await queryAll(db, {
      IndexName: GSI1,
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': gsi.subscribers },
      ScanIndexForward: false,
    })
    return items.map(toSubscriber)
  },

  countCharitySubscribers: async (charityId) => {
    const items = await queryAll(db, {
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sub)',
      ExpressionAttributeValues: { ':pk': charityPk(charityId), ':sub': 'SUB#' },
      ProjectionExpression: 'SK',
    })
    return items.length
  },
})
