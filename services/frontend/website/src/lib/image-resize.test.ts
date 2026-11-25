import { afterEach, describe, expect, it, vi } from 'vitest'

import { LIMITS } from '@shared/contracts'

import {
  IMAGE_MAX_EDGE,
  bytesToBase64,
  edgeSteps,
  fitWithin,
  fitsLimit,
  isAcceptedImage,
  outputType,
  resizeImage,
} from './image-resize'

describe('fitWithin', () => {
  it('scales the long edge down to the limit and keeps the ratio', () => {
    expect(fitWithin({ width: 4000, height: 3000 }, 1600)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin({ width: 3000, height: 4000 }, 1600)).toEqual({ width: 1200, height: 1600 })
  })

  it('never scales up', () => {
    expect(fitWithin({ width: 800, height: 600 }, 1600)).toEqual({ width: 800, height: 600 })
  })

  it('keeps at least one pixel on a very thin image', () => {
    expect(fitWithin({ width: 10000, height: 2 }, 1600)).toEqual({ width: 1600, height: 1 })
  })

  it('leaves an empty size alone', () => {
    expect(fitWithin({ width: 0, height: 0 }, 1600)).toEqual({ width: 0, height: 0 })
  })
})

describe('edgeSteps', () => {
  it('starts at the max edge and shrinks by a fifth each time', () => {
    const steps = edgeSteps({ width: 5000, height: 3000 })
    expect(steps[0]).toBe(IMAGE_MAX_EDGE)
    expect(steps[1]).toBe(1280)
    expect(steps.at(-1)).toBeGreaterThanOrEqual(320)
  })

  it('starts at the image itself when it is already small', () => {
    expect(edgeSteps({ width: 500, height: 400 })).toEqual([500, 400, 320])
  })

  it('always has one step, even for a tiny image', () => {
    expect(edgeSteps({ width: 100, height: 50 })).toEqual([100])
  })
})

describe('the small helpers', () => {
  it('falls back to JPEG when the canvas did not write WebP', () => {
    expect(outputType('image/webp')).toBe('image/webp')
    expect(outputType('image/png')).toBe('image/jpeg')
  })

  it('checks the byte limit', () => {
    expect(fitsLimit(LIMITS.uploadMaxBytes)).toBe(true)
    expect(fitsLimit(LIMITS.uploadMaxBytes + 1)).toBe(false)
    expect(fitsLimit(0)).toBe(false)
  })

  it('accepts photo formats and rejects everything else', () => {
    expect(isAcceptedImage('image/jpeg')).toBe(true)
    expect(isAcceptedImage('image/heic')).toBe(true)
    expect(isAcceptedImage('application/pdf')).toBe(false)
    expect(isAcceptedImage('image/svg+xml')).toBe(false)
  })

  it('encodes bytes as base64, also past one chunk', () => {
    expect(bytesToBase64(new Uint8Array([72, 105]))).toBe('SGk=')
    const big = new Uint8Array(0x8000 * 2 + 3).fill(65)
    expect(atob(bytesToBase64(big))).toHaveLength(big.length)
  })
})

describe('resizeImage', () => {
  afterEach(() => vi.unstubAllGlobals())

  const file = (type = 'image/jpeg') => new File([new Uint8Array([1, 2, 3])], 'foto.jpg', { type })

  it('refuses a file that is not an image', async () => {
    expect(await resizeImage(file('text/plain'))).toEqual({ ok: false, error: 'unsupported' })
  })

  it('reports an image the browser cannot decode', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('bad')))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(await resizeImage(file())).toEqual({ ok: false, error: 'unreadable' })
  })

  it('reports a browser without a 2D canvas', async () => {
    const close = vi.fn()
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 2000, height: 1000, close }))
    expect(await resizeImage(file())).toEqual({ ok: false, error: 'unreadable' })
    expect(close).toHaveBeenCalled()
  })

  describe('with a canvas', () => {
    const stubCanvas = (blobFor: (type: string, quality: number) => Blob | null) => {
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as never)
      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, cb, type, quality) {
        cb(blobFor(type ?? '', quality ?? 1))
      })
      vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 4000, height: 3000, close: vi.fn() }))
    }

    it('writes WebP at the first quality that fits', async () => {
      stubCanvas((type) => new Blob([new Uint8Array(10)], { type }))
      const result = await resizeImage(file())
      expect(result).toMatchObject({ ok: true, image: { contentType: 'image/webp', width: 1600, height: 1200, bytes: 10 } })
    })

    it('uses JPEG where the browser writes PNG for WebP', async () => {
      stubCanvas((type) => new Blob([new Uint8Array(10)], { type: type === 'image/webp' ? 'image/png' : type }))
      const result = await resizeImage(file())
      expect(result).toMatchObject({ ok: true, image: { contentType: 'image/jpeg' } })
    })

    it('shrinks further when even the lowest quality is too big', async () => {
      const widths: number[] = []
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as never)
      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, cb, type) {
        widths.push(this.width)
        const size = this.width > 1300 ? LIMITS.uploadMaxBytes + 1 : 100
        cb(new Blob([new Uint8Array(size)], { type: type ?? '' }))
      })
      vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 4000, height: 3000, close: vi.fn() }))
      const result = await resizeImage(file())
      expect(result).toMatchObject({ ok: true, image: { width: 1280 } })
      expect(widths).toContain(1600)
    })

    it('gives up when nothing fits', async () => {
      stubCanvas((type) => new Blob([new Uint8Array(LIMITS.uploadMaxBytes + 1)], { type }))
      expect(await resizeImage(file())).toEqual({ ok: false, error: 'too_large' })
    })
  })
})
