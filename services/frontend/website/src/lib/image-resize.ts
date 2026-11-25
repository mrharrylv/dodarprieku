/**
 * Shrinks a photo in the browser before it is uploaded (doc/specs/dodarprieku.md,
 * flow 1): at most `IMAGE_MAX_EDGE` px on the long edge, re-encoded as WebP
 * where the browser can, JPEG where it cannot, and under
 * `LIMITS.uploadMaxBytes`. The arithmetic is pure and exported for tests; only
 * `resizeImage` touches the canvas.
 */

import { LIMITS, type UploadContentType } from '@shared/contracts'

export const IMAGE_MAX_EDGE = 1600
/** Tried in order until the encoded image fits under the byte limit. */
export const QUALITY_STEPS = [0.86, 0.78, 0.7, 0.6, 0.5] as const
/** When even the lowest quality is too big, the edge shrinks by this and tries again. */
export const SHRINK_FACTOR = 0.8
const MIN_EDGE = 320

export interface Size {
  readonly width: number
  readonly height: number
}

/** Scales a size down (never up) so its long edge is at most `maxEdge`. */
export const fitWithin = (size: Size, maxEdge: number): Size => {
  const longest = Math.max(size.width, size.height)
  if (longest <= maxEdge || longest === 0) return { width: size.width, height: size.height }
  const scale = maxEdge / longest
  return { width: Math.max(1, Math.round(size.width * scale)), height: Math.max(1, Math.round(size.height * scale)) }
}

/** The long edges to try, from `IMAGE_MAX_EDGE` down to `MIN_EDGE`. */
export const edgeSteps = (size: Size, maxEdge: number = IMAGE_MAX_EDGE): readonly number[] => {
  const start = Math.min(Math.max(size.width, size.height), maxEdge)
  const steps: number[] = []
  for (let edge = start; edge >= MIN_EDGE; edge = Math.round(edge * SHRINK_FACTOR)) steps.push(edge)
  return steps.length === 0 ? [start] : steps
}

/** A canvas that cannot write WebP silently writes PNG; that is the signal to use JPEG. */
export const outputType = (encodedType: string): UploadContentType =>
  encodedType === 'image/webp' ? 'image/webp' : 'image/jpeg'

export const fitsLimit = (bytes: number): boolean => bytes > 0 && bytes <= LIMITS.uploadMaxBytes

export const isAcceptedImage = (type: string): boolean => /^image\/(jpeg|png|webp|gif|heic|heif|avif|bmp)$/.test(type)

/** Base64 of raw bytes, in chunks so a 2 MB image does not overflow the call stack. */
export const bytesToBase64 = (bytes: Uint8Array): string => {
  const chunk = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export type ResizeFailure = 'unsupported' | 'unreadable' | 'too_large'

export interface ResizedImage {
  readonly contentType: UploadContentType
  readonly dataBase64: string
  readonly bytes: number
  readonly width: number
  readonly height: number
}

export type ResizeResult = { readonly ok: true; readonly image: ResizedImage } | { readonly ok: false; readonly error: ResizeFailure }

const encode = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality))

const drawScaled = (bitmap: ImageBitmap, size: Size): HTMLCanvasElement | null => {
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const context = canvas.getContext('2d')
  if (!context) return null
  context.drawImage(bitmap, 0, 0, size.width, size.height)
  return canvas
}

const encodeUnderLimit = async (canvas: HTMLCanvasElement): Promise<Blob | null> => {
  for (const quality of QUALITY_STEPS) {
    const webp = await encode(canvas, 'image/webp', quality)
    const blob = webp && webp.type === 'image/webp' ? webp : await encode(canvas, 'image/jpeg', quality)
    if (blob && fitsLimit(blob.size)) return blob
  }
  return null
}

/** Resizes and re-encodes one file. Never throws. */
export const resizeImage = async (file: File): Promise<ResizeResult> => {
  if (!isAcceptedImage(file.type)) return { ok: false, error: 'unsupported' }
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch (err) {
    console.error('[image-resize] could not decode the image', err)
    return { ok: false, error: 'unreadable' }
  }
  try {
    for (const edge of edgeSteps(bitmap)) {
      const size = fitWithin(bitmap, edge)
      const canvas = drawScaled(bitmap, size)
      if (!canvas) return { ok: false, error: 'unreadable' }
      const blob = await encodeUnderLimit(canvas)
      if (blob) {
        const bytes = new Uint8Array(await blob.arrayBuffer())
        return {
          ok: true,
          image: { contentType: outputType(blob.type), dataBase64: bytesToBase64(bytes), bytes: blob.size, ...size },
        }
      }
    }
    return { ok: false, error: 'too_large' }
  } finally {
    bitmap.close()
  }
}
