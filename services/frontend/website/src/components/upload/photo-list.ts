/** Pure edits of a profile's photo keys. The first key is the cover photo. */

import { LIMITS, MEDIA_PREFIX } from '@shared/contracts'

export const mediaUrl = (key: string): string => `${MEDIA_PREFIX}${key}`

export const slotsLeft = (photos: readonly string[], pending = 0): number =>
  Math.max(0, LIMITS.maxPhotos - photos.length - pending)

export const addPhoto = (photos: readonly string[], key: string): readonly string[] =>
  photos.length >= LIMITS.maxPhotos || photos.includes(key) ? photos : [...photos, key]

export const removePhoto = (photos: readonly string[], key: string): readonly string[] =>
  photos.filter((k) => k !== key)

/** Moves one photo to the front, which makes it the cover. */
export const makeCover = (photos: readonly string[], key: string): readonly string[] =>
  photos.includes(key) ? [key, ...photos.filter((k) => k !== key)] : photos
