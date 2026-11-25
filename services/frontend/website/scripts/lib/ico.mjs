/**
 * Packs square PNGs into one .ico file, and reads the directory back.
 *
 * `/favicon.ico` is the one icon every crawler asks for by name, whatever the
 * HTML says: Google's favicon fetcher, Bing, feed readers and old browsers all
 * request it. Without the file, CloudFront answers that request with the SPA's
 * index.html and a 200, and the site shows up with a blank globe.
 *
 * Each entry is stored as PNG rather than as a BMP bitmap. Every browser since
 * IE9, and Google's fetcher, reads PNG entries, and they are a fraction of the
 * size.
 *
 * Layout: ICONDIR (6 bytes), one ICONDIRENTRY (16 bytes) per image, then the
 * PNG bytes of each image in order.
 */

const HEADER_BYTES = 6
const ENTRY_BYTES = 16
const MAX_SIZE = 256
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const isPng = (buffer) => Buffer.isBuffer(buffer) && buffer.subarray(0, 8).equals(PNG_SIGNATURE)

/** The ICO format stores 256 as 0, because the field is one byte. */
const sizeByte = (size) => (size === MAX_SIZE ? 0 : size)

const assertValid = ({ size, png }) => {
  if (!Number.isInteger(size) || size < 1 || size > MAX_SIZE) {
    throw new Error(`encodeIco: size ${size} is outside 1-${MAX_SIZE}`)
  }
  if (!isPng(png)) throw new Error(`encodeIco: the ${size}px entry is not a PNG`)
}

/**
 * @param {ReadonlyArray<{ size: number, png: Buffer }>} images square PNGs, 1-256 px
 * @returns {Buffer}
 */
export const encodeIco = (images) => {
  if (images.length === 0) throw new Error('encodeIco: at least one image is required')
  images.forEach(assertValid)

  const header = Buffer.alloc(HEADER_BYTES)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type 1 = icon
  header.writeUInt16LE(images.length, 4)

  const offsets = images.reduce(
    (acc, { png }) => [...acc, acc[acc.length - 1] + png.length],
    [HEADER_BYTES + ENTRY_BYTES * images.length],
  )

  const entries = images.map(({ size, png }, index) => {
    const entry = Buffer.alloc(ENTRY_BYTES)
    entry.writeUInt8(sizeByte(size), 0) // width
    entry.writeUInt8(sizeByte(size), 1) // height
    entry.writeUInt8(0, 2) // palette colours: none
    entry.writeUInt8(0, 3) // reserved
    entry.writeUInt16LE(1, 4) // colour planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offsets[index], 12)
    return entry
  })

  return Buffer.concat([header, ...entries, ...images.map(({ png }) => png)])
}

/**
 * Reads back the directory of an .ico, for the tests and the generator's own
 * sanity check.
 *
 * @param {Buffer} ico
 * @returns {Array<{ width: number, height: number, bytes: number, offset: number }>}
 */
export const readIcoDirectory = (ico) => {
  if (ico.length < HEADER_BYTES || ico.readUInt16LE(0) !== 0 || ico.readUInt16LE(2) !== 1) {
    throw new Error('readIcoDirectory: not an icon file')
  }
  const count = ico.readUInt16LE(4)
  return Array.from({ length: count }, (_, index) => {
    const at = HEADER_BYTES + index * ENTRY_BYTES
    return {
      width: ico.readUInt8(at) || MAX_SIZE,
      height: ico.readUInt8(at + 1) || MAX_SIZE,
      bytes: ico.readUInt32LE(at + 8),
      offset: ico.readUInt32LE(at + 12),
    }
  })
}
