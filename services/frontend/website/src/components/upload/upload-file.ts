/**
 * One image from the device to a media key: resize in the browser, then
 * `POST /api/uploads` as base64. Every failure comes back as a code the
 * uploader shows beside that file.
 */

import { uploadImage, type ApiFailureKind } from '@/lib/account-api'
import { resizeImage, type ResizeFailure } from '@/lib/image-resize'

export type UploadStage = 'resizing' | 'uploading'
export type UploadFailure = ResizeFailure | ApiFailureKind

export type UploadOutcome = { readonly ok: true; readonly key: string } | { readonly ok: false; readonly error: UploadFailure }

export const uploadFile = async (
  file: File,
  kind: 'photo' | 'logo',
  onStage: (stage: UploadStage) => void = () => undefined,
): Promise<UploadOutcome> => {
  onStage('resizing')
  const resized = await resizeImage(file)
  if (!resized.ok) return { ok: false, error: resized.error }
  onStage('uploading')
  const result = await uploadImage({ kind, contentType: resized.image.contentType, dataBase64: resized.image.dataBase64 })
  return result.ok ? { ok: true, key: result.data.key } : { ok: false, error: result.error }
}

/** The uploader's copy key for a failure; everything unexpected shares one message. */
export const uploadErrorKey = (error: UploadFailure): string => {
  const known: readonly string[] = ['unsupported', 'unreadable', 'too_large', 'rate_limited', 'network', 'timeout', 'server']
  return `upload.errors.${known.includes(error) ? error : 'generic'}`
}
