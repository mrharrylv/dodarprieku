import { beforeEach, describe, expect, it } from 'vitest'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  BatchWriteCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb'
import { mockClient } from 'aws-sdk-client-mock'
import { validProfile } from '../../test/helpers'
import type { CharityRecord } from '../types'
import { createDocumentClient, createDynamoRepository } from './index'

const ddb = mockClient(DynamoDBDocumentClient)
const repo = createDynamoRepository('tbl', createDocumentClient(new DynamoDBClient({ region: 'eu-north-1' })))

const conditional = Object.assign(new Error('failed'), { name: 'ConditionalCheckFailedException' })

const charity: CharityRecord = {
  id: 'c1', status: 'approved', slug: 'kepa', profile: validProfile(), accountEmail: 'a@b.lv', views: 3, pledges: 1,
  createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z', publishedAt: '2026-11-02T00:00:00.000Z',
}

beforeEach(() => ddb.reset())

describe('charities', () => {
  it('creates META with the status index and a not-exists condition', async () => {
    ddb.on(PutCommand).resolves({})
    await repo.createCharity(charity)
    const input = ddb.commandCalls(PutCommand)[0]!.args[0].input
    expect(input).toMatchObject({
      TableName: 'tbl',
      Item: { PK: 'CHARITY#c1', SK: 'META', GSI1PK: 'STATUS#approved', GSI1SK: '2026-11-01T00:00:00.000Z', slug: 'kepa' },
      ConditionExpression: 'attribute_not_exists(PK)',
    })
  })

  it('reads a charity back without key attributes, counters as numbers', async () => {
    ddb.on(GetCommand).resolves({ Item: { PK: 'CHARITY#c1', SK: 'META', GSI1PK: 'x', type: 'charity', ...charity, views: undefined } })
    const c = await repo.getCharity('c1')
    expect(c).toMatchObject({ id: 'c1', views: 0, pledges: 1 })
    expect(c).not.toHaveProperty('PK')
    ddb.on(GetCommand).resolves({})
    expect(await repo.getCharity('x')).toBeUndefined()
  })

  it('saves with SET for fields and REMOVE for absent reasons, never touching counters', async () => {
    ddb.on(UpdateCommand).resolves({})
    const { publishedAt: _p, ...rest } = charity
    await repo.saveCharity({ ...rest, rejectReason: 'r' })
    const input = ddb.commandCalls(UpdateCommand)[0]!.args[0].input
    expect(input.Key).toEqual({ PK: 'CHARITY#c1', SK: 'META' })
    expect(input.UpdateExpression).toContain('rejectReason = :rejectReason')
    expect(input.UpdateExpression).toContain('REMOVE suspendReason, publishedAt')
    expect(input.UpdateExpression).not.toContain('views')
    expect(input.ExpressionAttributeValues?.[':gpk']).toBe('STATUS#approved')
    await repo.saveCharity({ ...charity, rejectReason: 'a', suspendReason: 'b' })
    expect(ddb.commandCalls(UpdateCommand)[1]!.args[0].input.UpdateExpression).not.toContain('REMOVE')
  })

  it('lists by status index, all four statuses when unfiltered, paging', async () => {
    ddb.on(QueryCommand).callsFake((input) => {
      if (input.ExpressionAttributeValues[':pk'] === 'STATUS#approved' && !input.ExclusiveStartKey) {
        return { Items: [{ ...charity }], LastEvaluatedKey: { PK: 'x' } }
      }
      if (input.ExclusiveStartKey) return { Items: [{ ...charity, id: 'c0', createdAt: '2026-10-01T00:00:00.000Z' }] }
      return { Items: [] }
    })
    const all = await repo.listCharities()
    expect(all.map((c) => c.id)).toEqual(['c1', 'c0'])
    const pks = ddb.commandCalls(QueryCommand).map((c) => c.args[0].input.ExpressionAttributeValues?.[':pk'])
    expect(pks).toEqual(expect.arrayContaining(['STATUS#pending', 'STATUS#approved', 'STATUS#rejected', 'STATUS#suspended']))
    ddb.reset()
    ddb.on(QueryCommand).resolves({})
    expect(await repo.listCharities('pending')).toEqual([])
    expect(ddb.commandCalls(QueryCommand)[0]!.args[0].input).toMatchObject({ IndexName: 'GSI1', ScanIndexForward: false })
  })

  it('deletes every item under the charity and unlinks subscribers', async () => {
    const items = Array.from({ length: 27 }, (_, i) => ({ PK: 'CHARITY#c1', SK: `PLEDGE#${i}` }))
    ddb.on(QueryCommand).resolves({ Items: [...items, { PK: 'CHARITY#c1', SK: 'SUB#s@b.lv' }] })
    ddb.on(UpdateCommand).resolves({})
    ddb.on(BatchWriteCommand)
      .resolvesOnce({ UnprocessedItems: { tbl: [{ DeleteRequest: { Key: { PK: 'CHARITY#c1', SK: 'PLEDGE#0' } } }] } })
      .resolves({})
    await repo.deleteCharity('c1')
    const unlink = ddb.commandCalls(UpdateCommand)[0]!.args[0].input
    expect(unlink).toMatchObject({ Key: { PK: 'SUBSCRIBER#s@b.lv', SK: 'SUB' }, UpdateExpression: 'DELETE charityIds :ids' })
    const batches = ddb.commandCalls(BatchWriteCommand).map((c) => c.args[0].input.RequestItems?.tbl?.length)
    expect(batches).toEqual([25, 1, 3])
  })

  it('gives up on a batch that never drains', async () => {
    ddb.on(QueryCommand).resolves({ Items: [{ PK: 'CHARITY#c1', SK: 'META' }] })
    ddb.on(BatchWriteCommand).resolves({ UnprocessedItems: { tbl: [{ DeleteRequest: { Key: { PK: 'CHARITY#c1', SK: 'META' } } }] } })
    await expect(repo.deleteCharity('c1')).rejects.toThrow(/unprocessed/)
  })

  it('increments views conditionally, ignoring a missing charity', async () => {
    ddb.on(UpdateCommand).rejectsOnce(conditional).rejectsOnce(new Error('boom'))
    await repo.incrementViews('gone')
    await expect(repo.incrementViews('c1')).rejects.toThrow('boom')
    expect(ddb.commandCalls(UpdateCommand)[0]!.args[0].input.UpdateExpression).toBe('ADD #views :one')
  })
})

describe('slugs and updates', () => {
  it('claims a slug with a conditional put', async () => {
    ddb.on(PutCommand).resolvesOnce({}).rejectsOnce(conditional).rejectsOnce(new Error('down'))
    expect(await repo.claimSlug('kepa', 'c1')).toBe(true)
    expect(await repo.claimSlug('kepa', 'c2')).toBe(false)
    await expect(repo.claimSlug('kepa', 'c3')).rejects.toThrow('down')
    expect(ddb.commandCalls(PutCommand)[0]!.args[0].input.Item).toMatchObject({ PK: 'SLUG#kepa', SK: 'SLUG', charityId: 'c1' })
    ddb.on(DeleteCommand).resolves({})
    await repo.releaseSlug('kepa')
    expect(ddb.commandCalls(DeleteCommand)[0]!.args[0].input.Key).toEqual({ PK: 'SLUG#kepa', SK: 'SLUG' })
  })

  it('stores, reads, lists and deletes the pending update', async () => {
    ddb.on(PutCommand).resolves({})
    await repo.putUpdate({ charityId: 'c1', profile: validProfile(), submittedAt: 't' })
    expect(ddb.commandCalls(PutCommand)[0]!.args[0].input.Item).toMatchObject({ PK: 'CHARITY#c1', SK: 'UPDATE', GSI1PK: 'UPDATES', GSI1SK: 't' })
    ddb.on(GetCommand).resolvesOnce({ Item: { PK: 'CHARITY#c1', SK: 'UPDATE', charityId: 'c1', submittedAt: 't' } }).resolvesOnce({})
    expect(await repo.getUpdate('c1')).toEqual({ charityId: 'c1', submittedAt: 't' })
    expect(await repo.getUpdate('c2')).toBeUndefined()
    ddb.on(QueryCommand).resolves({ Items: [{ charityId: 'c1' }] })
    expect(await repo.listUpdateIds()).toEqual(['c1'])
    ddb.on(DeleteCommand).resolves({})
    await repo.deleteUpdate('c1')
    expect(ddb.commandCalls(DeleteCommand)[0]!.args[0].input.Key).toEqual({ PK: 'CHARITY#c1', SK: 'UPDATE' })
  })
})

describe('accounts, tokens, subscribers', () => {
  it('keys accounts by email with a role index', async () => {
    ddb.on(PutCommand).resolves({})
    await repo.putAccount({ email: 'a@b.lv', role: 'admin', sessionVersion: 0, createdAt: 't', updatedAt: 't' })
    expect(ddb.commandCalls(PutCommand)[0]!.args[0].input.Item).toMatchObject({ PK: 'ACCOUNT#a@b.lv', SK: 'ACCOUNT', GSI1PK: 'ROLE#admin', GSI1SK: 'a@b.lv' })
    ddb.on(GetCommand).resolvesOnce({ Item: { PK: 'ACCOUNT#a@b.lv', SK: 'ACCOUNT', email: 'a@b.lv' } }).resolvesOnce({})
    expect(await repo.getAccount('a@b.lv')).toEqual({ email: 'a@b.lv' })
    expect(await repo.getAccount('x@b.lv')).toBeUndefined()
    ddb.on(DeleteCommand).resolves({})
    await repo.deleteAccount('a@b.lv')
  })

  it('stores tokens by hash with ttl and consumes them atomically', async () => {
    ddb.on(PutCommand).resolves({})
    await repo.putToken({ hash: 'h', purpose: 'reset', email: 'a@b.lv', expiresAt: 100 })
    expect(ddb.commandCalls(PutCommand)[0]!.args[0].input.Item).toMatchObject({ PK: 'TOKEN#h', SK: 'TOKEN', ttl: 100 })
    ddb.on(DeleteCommand).resolvesOnce({ Attributes: { PK: 'TOKEN#h', SK: 'TOKEN', ttl: 100, hash: 'h', expiresAt: 100 } }).resolvesOnce({})
    expect(await repo.consumeToken('h')).toEqual({ hash: 'h', expiresAt: 100 })
    expect(await repo.consumeToken('h')).toBeUndefined()
    expect(ddb.commandCalls(DeleteCommand)[0]!.args[0].input.ReturnValues).toBe('ALL_OLD')
  })

  it('upserts subscribers with a string set and a charity link', async () => {
    ddb.on(UpdateCommand).resolves({})
    ddb.on(PutCommand).resolves({})
    await repo.upsertSubscriber({ email: 's@b.lv', name: 'Līga', charityId: 'c1', consentAt: 't', source: 'pledge' })
    const input = ddb.commandCalls(UpdateCommand)[0]!.args[0].input
    expect(input.Key).toEqual({ PK: 'SUBSCRIBER#s@b.lv', SK: 'SUB' })
    expect(input.UpdateExpression).toContain('ADD charityIds :ids')
    expect(input.UpdateExpression).toContain('#name = :name')
    expect(input.ExpressionAttributeValues?.[':ids']).toEqual(new Set(['c1']))
    expect(ddb.commandCalls(PutCommand)[0]!.args[0].input.Item).toMatchObject({ PK: 'CHARITY#c1', SK: 'SUB#s@b.lv' })
    await repo.upsertSubscriber({ email: 's@b.lv', consentAt: 't', source: 'subscribe' })
    expect(ddb.commandCalls(UpdateCommand)[1]!.args[0].input.UpdateExpression).not.toContain('ADD')
    expect(ddb.commandCalls(PutCommand)).toHaveLength(1)
  })

  it('lists and counts subscribers', async () => {
    ddb.on(QueryCommand).resolvesOnce({
      Items: [
        { email: 's@b.lv', name: 'Līga', charityIds: new Set(['c2', 'c1']), createdAt: 't' },
        { email: 'x@b.lv', createdAt: 't' },
      ],
    }).resolvesOnce({ Items: [{ SK: 'SUB#a' }, { SK: 'SUB#b' }] })
    expect(await repo.listSubscribers()).toEqual([
      { email: 's@b.lv', name: 'Līga', charityIds: ['c1', 'c2'], createdAt: 't' },
      { email: 'x@b.lv', charityIds: [], createdAt: 't' },
    ])
    expect(await repo.countCharitySubscribers('c1')).toBe(2)
  })
})

describe('pledges, list requests, rate limits', () => {
  const pledge = { id: 'p1', charityId: 'c1', needs: ['a', 'custom:1'], anonymous: true, createdAt: '2026-11-25T10:00:00.000Z' }

  it('records a pledge: item, META counter, per-need map', async () => {
    ddb.on(PutCommand).resolves({})
    ddb.on(UpdateCommand).resolves({})
    await repo.recordPledge(pledge)
    expect(ddb.commandCalls(PutCommand)[0]!.args[0].input.Item).toMatchObject({
      PK: 'CHARITY#c1', SK: 'PLEDGE#2026-11-25T10:00:00.000Z#p1', GSI1PK: 'PLEDGES',
    })
    const [meta, ensure, counts] = ddb.commandCalls(UpdateCommand).map((c) => c.args[0].input)
    expect(meta).toMatchObject({ Key: { PK: 'CHARITY#c1', SK: 'META' }, UpdateExpression: 'ADD pledges :one' })
    expect(ensure).toMatchObject({ Key: { PK: 'CHARITY#c1', SK: 'NEEDCOUNT' } })
    expect(counts?.UpdateExpression).toBe('SET byNeed.#k0 = if_not_exists(byNeed.#k0, :zero) + :one, byNeed.#k1 = if_not_exists(byNeed.#k1, :zero) + :one')
    expect(counts?.ExpressionAttributeNames).toEqual({ '#k0': 'a', '#k1': 'custom:1' })
    ddb.reset()
    ddb.on(PutCommand).resolves({})
    ddb.on(UpdateCommand).resolves({})
    await repo.recordPledge({ ...pledge, needs: [] })
    expect(ddb.commandCalls(UpdateCommand)).toHaveLength(1)
  })

  it('lists pledges per charity or from the index, and reads need counts', async () => {
    ddb.on(QueryCommand).resolves({ Items: [{ PK: 'x', SK: 'y', type: 'pledge', GSI1PK: 'PLEDGES', ...pledge }] })
    expect(await repo.listPledges('c1')).toEqual([pledge])
    expect(ddb.commandCalls(QueryCommand)[0]!.args[0].input.ExpressionAttributeValues).toEqual({ ':pk': 'CHARITY#c1', ':prefix': 'PLEDGE#' })
    await repo.listPledges()
    expect(ddb.commandCalls(QueryCommand)[1]!.args[0].input.IndexName).toBe('GSI1')
    ddb.on(GetCommand).resolvesOnce({ Item: { byNeed: { a: 2 } } }).resolvesOnce({})
    expect(await repo.getNeedCounts('c1')).toEqual({ a: 2 })
    expect(await repo.getNeedCounts('c1')).toEqual({})
  })

  it('stores and finds list requests', async () => {
    const r = { id: 'r1', charityId: 'c1', charityName: 'Ķepa', status: 'open' as const, createdAt: 't' }
    ddb.on(PutCommand).resolves({})
    await repo.putListRequest(r)
    expect(ddb.commandCalls(PutCommand)[0]!.args[0].input.Item).toMatchObject({ PK: 'CHARITY#c1', SK: 'LISTREQ#t#r1', GSI1PK: 'LISTREQS' })
    ddb.on(QueryCommand).resolves({ Items: [{ PK: 'p', SK: 's', ...r }] })
    expect(await repo.getListRequest('c1', 'r1')).toEqual(r)
    expect(await repo.getListRequest('c1', 'r2')).toBeUndefined()
    expect(await repo.listListRequests('c1')).toEqual([r])
    expect(await repo.listListRequests()).toEqual([r])
  })

  it('counts rate-limit hits with ADD and a ttl', async () => {
    ddb.on(UpdateCommand).resolvesOnce({ Attributes: { count: 3 } }).resolvesOnce({})
    expect(await repo.hitRateLimit('login#h', 'w', 99)).toBe(3)
    expect(await repo.hitRateLimit('login#h', 'w', 99)).toBe(1)
    expect(ddb.commandCalls(UpdateCommand)[0]!.args[0].input).toMatchObject({
      Key: { PK: 'RATE#login#h', SK: 'w' },
      ExpressionAttributeValues: { ':one': 1, ':ttl': 99 },
    })
  })
})
