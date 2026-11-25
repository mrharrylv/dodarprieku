import { beforeEach, describe, expect, it } from 'vitest'
import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { mockClient } from 'aws-sdk-client-mock'
import { createMemoryStorage } from './memory'
import { createS3Storage } from './s3'
import { SNAPSHOT_OBJECT_KEY, mediaObjectKey } from './types'

const s3 = mockClient(S3Client)
const storage = createS3Storage('media-bucket', new S3Client({ region: 'eu-north-1' }))
beforeEach(() => s3.reset())

describe('object keys', () => {
  it('mirror the CloudFront paths', () => {
    expect(mediaObjectKey('uploads/2026/11/a.webp')).toBe('media/uploads/2026/11/a.webp')
    expect(SNAPSHOT_OBJECT_KEY).toBe('data/charities.json')
  })
})

describe('S3 storage', () => {
  it('puts with content type and cache control', async () => {
    s3.on(PutObjectCommand).resolves({})
    await storage.put('k', { body: new Uint8Array([1]), contentType: 'image/png', cacheControl: 'c' })
    expect(s3.commandCalls(PutObjectCommand)[0]!.args[0].input).toMatchObject({
      Bucket: 'media-bucket', Key: 'k', ContentType: 'image/png', CacheControl: 'c',
    })
  })

  it('gets an object, or undefined when missing; other errors propagate', async () => {
    s3.on(GetObjectCommand)
      .resolvesOnce({ Body: { transformToByteArray: async () => new Uint8Array([7]) } as never, ContentType: 'image/png', CacheControl: 'c' })
      .resolvesOnce({})
      .rejectsOnce(Object.assign(new Error('x'), { name: 'NoSuchKey' }))
      .rejectsOnce(new Error('denied'))
    expect(await storage.get('k')).toEqual({ body: new Uint8Array([7]), contentType: 'image/png', cacheControl: 'c' })
    expect(await storage.get('k')).toEqual({ body: new Uint8Array(), contentType: 'application/octet-stream', cacheControl: '' })
    expect(await storage.get('k')).toBeUndefined()
    await expect(storage.get('k')).rejects.toThrow('denied')
  })

  it('deletes in batches and reports per-object errors', async () => {
    s3.on(DeleteObjectsCommand).resolvesOnce({}).resolvesOnce({ Errors: [{ Key: 'b' }] })
    await storage.remove(['a'])
    expect(s3.commandCalls(DeleteObjectsCommand)[0]!.args[0].input.Delete).toEqual({ Objects: [{ Key: 'a' }], Quiet: true })
    await expect(storage.remove(['b'])).rejects.toThrow(/1 objects/)
  })
})

describe('memory storage', () => {
  it('stores copies', async () => {
    const m = createMemoryStorage()
    const body = new Uint8Array([1, 2])
    await m.put('k', { body, contentType: 't', cacheControl: 'c' })
    body[0] = 9
    expect((await m.get('k'))?.body).toEqual(new Uint8Array([1, 2]))
    expect(await m.get('nope')).toBeUndefined()
    await m.remove(['k'])
    expect(m.keys()).toEqual([])
  })
})
