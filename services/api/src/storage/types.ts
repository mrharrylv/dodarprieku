/**
 * The media bucket. Object keys mirror the CloudFront paths, so no edge
 * rewrite is needed: a profile's media key "uploads/2026/11/x.webp" is the
 * object "media/uploads/2026/11/x.webp", served at /media/uploads/2026/11/x.webp,
 * and the snapshot is "data/charities.json", served at /data/charities.json.
 */
import { MEDIA_PREFIX, SNAPSHOT_PATH } from '../../../shared/src/contracts'

export interface StoredObject {
  readonly body: Uint8Array
  readonly contentType: string
  readonly cacheControl: string
}

export interface Storage {
  readonly put: (objectKey: string, object: StoredObject) => Promise<void>
  readonly get: (objectKey: string) => Promise<StoredObject | undefined>
  readonly remove: (objectKeys: readonly string[]) => Promise<void>
}

export const mediaObjectKey = (mediaKey: string): string => `${MEDIA_PREFIX.slice(1)}${mediaKey}`
export const SNAPSHOT_OBJECT_KEY = SNAPSHOT_PATH.slice(1)

export const CACHE_IMMUTABLE = 'public, max-age=31536000, immutable'
export const CACHE_SNAPSHOT = 'public, max-age=60'
