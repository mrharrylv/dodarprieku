import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LIMITS } from '@shared/contracts'

import { fail, mockApi, ok } from '@/components/profile-editor/fetch-mock'
import { addPhoto, makeCover, mediaUrl, removePhoto, slotsLeft } from './photo-list'
import { uploadErrorKey, uploadFile } from './upload-file'

const resizeImage = vi.hoisted(() => vi.fn())
vi.mock('@/lib/image-resize', () => ({ resizeImage }))

describe('photo-list', () => {
  const photos = ['a', 'b', 'c'] as const

  it('makes a photo the cover by moving it to the front', () => {
    expect(makeCover(photos, 'c')).toEqual(['c', 'a', 'b'])
    expect(makeCover(photos, 'x')).toBe(photos)
  })

  it('adds without duplicates and up to the limit', () => {
    expect(addPhoto(photos, 'd')).toEqual(['a', 'b', 'c', 'd'])
    expect(addPhoto(photos, 'a')).toBe(photos)
    const full = Array.from({ length: LIMITS.maxPhotos }, (_, i) => `k${i}`)
    expect(addPhoto(full, 'new')).toBe(full)
  })

  it('removes, counts slots and builds media URLs', () => {
    expect(removePhoto(photos, 'b')).toEqual(['a', 'c'])
    expect(slotsLeft(photos, 1)).toBe(LIMITS.maxPhotos - 4)
    expect(slotsLeft(Array.from({ length: 9 }, String))).toBe(0)
    expect(mediaUrl('uploads/x.webp')).toBe('/media/uploads/x.webp')
  })
})

describe('uploadFile', () => {
  const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' })
  beforeEach(() => resizeImage.mockReset())

  it('resizes, uploads and returns the key, reporting each stage', async () => {
    resizeImage.mockResolvedValue({ ok: true, image: { contentType: 'image/webp', dataBase64: 'AAA=', bytes: 3, width: 1, height: 1 } })
    const fetchMock = mockApi({ 'POST /api/uploads': ok({ key: 'uploads/2026/11/abcdefgh.webp', url: '/media/x' }) })
    const stages: string[] = []
    expect(await uploadFile(file, 'logo', (s) => stages.push(s))).toEqual({ ok: true, key: 'uploads/2026/11/abcdefgh.webp' })
    expect(stages).toEqual(['resizing', 'uploading'])
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ kind: 'logo', contentType: 'image/webp', dataBase64: 'AAA=' })
  })

  it('stops at a resize failure without calling the API', async () => {
    resizeImage.mockResolvedValue({ ok: false, error: 'unsupported' })
    const fetchMock = mockApi({})
    expect(await uploadFile(file, 'photo')).toEqual({ ok: false, error: 'unsupported' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('passes the API failure on', async () => {
    resizeImage.mockResolvedValue({ ok: true, image: { contentType: 'image/jpeg', dataBase64: 'A', bytes: 1, width: 1, height: 1 } })
    mockApi({ 'POST /api/uploads': fail(429, 'rate_limited') })
    expect(await uploadFile(file, 'photo')).toEqual({ ok: false, error: 'rate_limited' })
  })

  it('maps failures to copy keys', () => {
    expect(uploadErrorKey('too_large')).toBe('upload.errors.too_large')
    expect(uploadErrorKey('forbidden')).toBe('upload.errors.generic')
  })
})
