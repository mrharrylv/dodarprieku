import { beforeEach, describe, expect, it } from 'vitest'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { BatchWriteCommand, DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { mockClient } from 'aws-sdk-client-mock'
import { SOURCE, importedItem } from '../../test/imported'
import type { CharityRecord } from '../types'
import { createDocumentClient, createDynamoRepository } from './index'

const ddb = mockClient(DynamoDBDocumentClient)
const repo = createDynamoRepository('tbl', createDocumentClient(new DynamoDBClient({ region: 'eu-north-1' })))

const record = (n: number): CharityRecord => {
  const item = importedItem(n)
  return {
    id: item.id, status: 'approved', slug: item.slug, profile: item.profile, accountEmail: '', source: SOURCE,
    views: 2, pledges: 0, createdAt: '2026-11-25T10:00:00.000Z', updatedAt: '2026-11-25T10:00:00.000Z',
    publishedAt: '2026-11-25T10:00:00.000Z',
  }
}

beforeEach(() => ddb.reset())

describe('putCharities', () => {
  it('writes each record with a conditional update that leaves the counters alone', async () => {
    ddb.on(UpdateCommand).resolves({})
    expect(await repo.putCharities([record(1), record(2)])).toEqual([])
    const inputs = ddb.commandCalls(UpdateCommand).map((c) => c.args[0].input)
    expect(inputs).toHaveLength(2)
    expect(inputs[0]).toMatchObject({
      TableName: 'tbl',
      Key: { PK: 'CHARITY#imp-L0001', SK: 'META' },
      ConditionExpression: 'attribute_not_exists(PK) OR (begins_with(#src, :import) AND #email = :unclaimed)',
      ExpressionAttributeValues: expect.objectContaining({ ':gpk': 'STATUS#approved', ':source': SOURCE, ':views': 2, ':type': 'charity' }),
    })
    const expr = inputs[0]!.UpdateExpression!
    expect(expr).toContain('#views = if_not_exists(#views, :views)')
    expect(expr).toContain('#pledges = if_not_exists(#pledges, :pledges)')
    expect(expr).not.toMatch(/#views = :views/)
    await repo.putCharities([])
    expect(ddb.commandCalls(UpdateCommand)).toHaveLength(2)
    expect(ddb.commandCalls(BatchWriteCommand)).toHaveLength(0)
  })

  it('returns the ids whose condition failed (claimed meanwhile), and throws on anything else', async () => {
    const failed = Object.assign(new Error('cond'), { name: 'ConditionalCheckFailedException' })
    ddb.on(UpdateCommand, { Key: { PK: 'CHARITY#imp-L0002', SK: 'META' } }).rejects(failed)
    ddb.on(UpdateCommand, { Key: { PK: 'CHARITY#imp-L0001', SK: 'META' } }).resolves({})
    expect(await repo.putCharities([record(1), record(2)])).toEqual(['imp-L0002'])
    ddb.reset()
    ddb.on(UpdateCommand).rejects(new Error('throttled'))
    await expect(repo.putCharities([record(1)])).rejects.toThrow('throttled')
  })
})

describe('source and slugs', () => {
  it('keeps source on save, and a slug claim succeeds again for its own charity', async () => {
    ddb.on(UpdateCommand).resolves({})
    await repo.saveCharity(record(1))
    const input = ddb.commandCalls(UpdateCommand)[0]!.args[0].input
    expect(input.UpdateExpression).toContain('source = :source')
    const { source: _s, ...plain } = record(1)
    await repo.saveCharity(plain)
    expect(ddb.commandCalls(UpdateCommand)[1]!.args[0].input.UpdateExpression).toMatch(/REMOVE .*source/)
    ddb.on(PutCommand).resolves({})
    await repo.claimSlug('kepa', 'c1')
    expect(ddb.commandCalls(PutCommand)[0]!.args[0].input).toMatchObject({
      ConditionExpression: 'attribute_not_exists(PK) OR charityId = :id',
      ExpressionAttributeValues: { ':id': 'c1' },
    })
  })
})
