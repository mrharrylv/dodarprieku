/** A solid-colour PNG, so the local map has photos without shipping binaries. */
import { crc32, deflateSync } from 'node:zlib'

const chunk = (type: string, data: Buffer): Buffer => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

export const solidPng = (width: number, height: number, rgb: readonly [number, number, number]): Uint8Array => {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.writeUInt8(8, 8) // bit depth
  header.writeUInt8(2, 9) // colour type: truecolour
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: width }, () => rgb).flat())])
  const raw = Buffer.concat(Array.from({ length: height }, () => row))
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', header),
      chunk('IDAT', deflateSync(raw)),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  )
}
