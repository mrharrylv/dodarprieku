import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import type { Storage } from './types'

const DELETE_BATCH = 1000

const isNoSuchKey = (err: unknown): boolean => err instanceof Error && (err.name === 'NoSuchKey' || err.name === 'NotFound')

export const createS3Storage = (bucket: string, client: S3Client = new S3Client({})): Storage => ({
  put: async (key, object) => {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: object.body,
        ContentType: object.contentType,
        CacheControl: object.cacheControl,
      }),
    )
  },

  get: async (key) => {
    try {
      const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
      const body = res.Body ? await res.Body.transformToByteArray() : new Uint8Array()
      return { body, contentType: res.ContentType ?? 'application/octet-stream', cacheControl: res.CacheControl ?? '' }
    } catch (err) {
      if (isNoSuchKey(err)) return undefined
      throw err
    }
  },

  remove: async (keys) => {
    for (let i = 0; i < keys.length; i += DELETE_BATCH) {
      const batch = keys.slice(i, i + DELETE_BATCH)
      const res = await client.send(
        new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true } }),
      )
      if (res.Errors && res.Errors.length > 0) throw new Error(`S3 delete failed for ${res.Errors.length} objects`)
    }
  },
})
