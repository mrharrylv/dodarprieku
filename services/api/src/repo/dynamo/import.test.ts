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
  it('writes whole items with keys and the status index, 25 per batch', async () => {
    ddb.on(BatchWriteCommand).resolves({})
    await repo.putCharities(Array.from({ length: 30 }, (_, i) => record(i + 1)))
    const calls = ddb.commandCalls(BatchWriteCommand).map((c) => c.args[0].input.RequestItems?.tbl ?? [])
    expect(calls.map((r) => r.length)).toEqual([25, 5])
    expect(calls[0]![0]).toEqual({
      PutRequest: {
        Item: expect.objectContaining({
          PK: 'CHARITY#imp-L0001', SK: 'META', GSI1PK: 'STATUS#approved', GSI1SK: '2026-11-25T10:00:00.000Z',
          type: 'charity', source: SOURCE, accountEmail: '', views: 2,
        }),
      },
    })
    await repo.putCharities([])
    expect(ddb.commandCalls(BatchWriteCommand)).toHaveLength(2)
  })

  it('retries unprocessed puts, and gives up when they never drain', async () => {
    const left = { UnprocessedItems: { tbl: [{ PutRequest: { Item: { PK: 'CHARITY#imp-L0001', SK: 'META' } } }] } }
    ddb.on(BatchWriteCommand).resolvesOnce(left).resolves({})
    await repo.putCharities([record(1), record(2)])
    const sizes = ddb.commandCalls(BatchWriteCommand).map((c) => c.args[0].input.RequestItems?.tbl?.length)
    expect(sizes).toEqual([2, 1])
    ddb.reset()
    ddb.on(BatchWriteCommand).resolves(left)
    await expect(repo.putCharities([record(1)])).rejects.toThrow(/batch put: unprocessed/)
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
