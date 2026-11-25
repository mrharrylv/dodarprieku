/** Upload checks: declared type, size and the file's own magic bytes must agree. */
import { LIMITS, UPLOAD_CONTENT_TYPES, type UploadContentType } from '../../../shared/src/contracts'

export const EXTENSIONS: Readonly<Record<UploadContentType, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const startsWith = (b: Uint8Array, sig: readonly number[], offset = 0): boolean =>
  b.length >= offset + sig.length && sig.every((v, i) => b[offset + i] === v)

const ascii = (s: string): number[] => [...s].map((c) => c.charCodeAt(0))

export const sniffContentType = (bytes: Uint8Array): UploadContentType | undefined => {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (startsWith(bytes, ascii('RIFF')) && startsWith(bytes, ascii('WEBP'), 8)) return 'image/webp'
  return undefined
}

export const isUploadContentType = (v: unknown): v is UploadContentType =>
  typeof v === 'string' && (UPLOAD_CONTENT_TYPES as readonly string[]).includes(v)

const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/
const DATA_URL_PREFIX = /^data:[a-z/+.-]+;base64,/i

export type DecodeResult =
  | { readonly ok: true; readonly bytes: Uint8Array }
  | { readonly ok: false; readonly error: 'invalid' | 'too_large' | 'type_mismatch' }

/** Decodes base64 (a data: URL prefix is tolerated) and checks size and magic bytes. */
export const decodeUpload = (dataBase64: string, contentType: UploadContentType): DecodeResult => {
  const clean = dataBase64.replace(DATA_URL_PREFIX, '').replace(/\s+/g, '')
  if (clean === '' || clean.length % 4 !== 0 || !BASE64_RE.test(clean)) return { ok: false, error: 'invalid' }
  if (Math.floor((clean.length * 3) / 4) - 2 > LIMITS.uploadMaxBytes) return { ok: false, error: 'too_large' }
  const bytes = new Uint8Array(Buffer.from(clean, 'base64'))
  if (bytes.length > LIMITS.uploadMaxBytes) return { ok: false, error: 'too_large' }
  if (sniffContentType(bytes) !== contentType) return { ok: false, error: 'type_mismatch' }
  return { ok: true, bytes }
}

/** uploads/YYYY/MM/<uuid>.<ext>, matching the validators' media key pattern. */
export const uploadKey = (now: Date, uuid: string, contentType: UploadContentType): string => {
  const yyyy = now.getUTCFullYear().toString().padStart(4, '0')
  const mm = (now.getUTCMonth() + 1).toString().padStart(2, '0')
  return `uploads/${yyyy}/${mm}/${uuid}.${EXTENSIONS[contentType]}`
}
