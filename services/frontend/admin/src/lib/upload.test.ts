import { describe, expect, it } from 'vitest'
import { LIMITS } from '@shared/contracts'
import { checkFile, toBase64, toUploadRequest } from './upload'

describe('upload', () => {
  it('accepts only the contract image types under the size limit', () => {
    expect(checkFile({ type: 'image/webp', size: 10 })).toBeUndefined()
    expect(checkFile({ type: 'image/gif', size: 10 })).toBe('type')
    expect(checkFile({ type: 'image/png', size: LIMITS.uploadMaxBytes + 1 })).toBe('size')
    expect(checkFile({ type: 'image/jpeg', size: LIMITS.uploadMaxBytes })).toBeUndefined()
  })
  it('encodes bytes as base64, also past one chunk', () => {
    expect(toBase64(new Uint8Array([104, 105]))).toBe('aGk=')
    const big = new Uint8Array(0x8000 + 3).fill(65)
    expect(atob(toBase64(big))).toHaveLength(0x8000 + 3)
  })
  it('builds an UploadRequest from a file', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'a.png', { type: 'image/png' })
    expect(await toUploadRequest(file, 'logo')).toEqual({ kind: 'logo', contentType: 'image/png', dataBase64: 'AQID' })
  })
})
