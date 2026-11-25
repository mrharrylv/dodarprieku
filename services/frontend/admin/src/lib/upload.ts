/** Turns a picked file into an UploadRequest, refusing what the API would refuse. */
import { LIMITS, UPLOAD_CONTENT_TYPES, type UploadContentType, type UploadRequest } from '@shared/contracts'

export type UploadProblem = 'type' | 'size'

export const checkFile = (file: { type: string; size: number }): UploadProblem | undefined => {
  if (!(UPLOAD_CONTENT_TYPES as readonly string[]).includes(file.type)) return 'type'
  if (file.size > LIMITS.uploadMaxBytes) return 'size'
  return undefined
}

export const toBase64 = (bytes: Uint8Array): string => {
  const CHUNK = 0x8000
  const parts: string[] = []
  for (let i = 0; i < bytes.length; i += CHUNK) parts.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK)))
  return btoa(parts.join(''))
}

export const toUploadRequest = async (file: File, kind: UploadRequest['kind']): Promise<UploadRequest> => ({
  kind,
  contentType: file.type as UploadContentType,
  dataBase64: toBase64(new Uint8Array(await file.arrayBuffer())),
})
