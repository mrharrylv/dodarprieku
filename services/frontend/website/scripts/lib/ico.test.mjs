import { describe, it, expect } from 'vitest'

import { encodeIco, readIcoDirectory } from './ico.mjs'

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const fakePng = (payloadBytes) => Buffer.from([...SIGNATURE, ...Array.from({ length: payloadBytes }, (_, i) => i % 251)])

describe('encodeIco', () => {
  const images = [
    { size: 16, png: fakePng(10) },
    { size: 32, png: fakePng(20) },
    { size: 48, png: fakePng(30) },
  ]

  it('writes a directory that reads back to the same sizes, in order', () => {
    const directory = readIcoDirectory(encodeIco(images))
    expect(directory.map((entry) => [entry.width, entry.height])).toEqual([
      [16, 16],
      [32, 32],
      [48, 48],
    ])
  })

  it('stores each PNG byte for byte where its entry points', () => {
    const ico = encodeIco(images)
    readIcoDirectory(ico).forEach((entry, index) => {
      expect(ico.subarray(entry.offset, entry.offset + entry.bytes).equals(images[index].png)).toBe(true)
    })
  })

  it('puts the first image straight after the header and the directory', () => {
    const [first] = readIcoDirectory(encodeIco(images))
    expect(first.offset).toBe(6 + 16 * images.length)
  })

  it('stores 256 as 0 and reads it back as 256', () => {
    const ico = encodeIco([{ size: 256, png: fakePng(4) }])
    expect(ico.readUInt8(6)).toBe(0)
    expect(readIcoDirectory(ico)[0].width).toBe(256)
  })

  it('does not change the images it is given', () => {
    const before = images.map(({ png }) => Buffer.from(png))
    encodeIco(images)
    images.forEach(({ png }, index) => expect(png.equals(before[index])).toBe(true))
  })

  it('refuses no images, a size out of range, and a non-PNG', () => {
    expect(() => encodeIco([])).toThrow(/at least one/)
    expect(() => encodeIco([{ size: 0, png: fakePng(1) }])).toThrow(/outside/)
    expect(() => encodeIco([{ size: 300, png: fakePng(1) }])).toThrow(/outside/)
    expect(() => encodeIco([{ size: 16.5, png: fakePng(1) }])).toThrow(/outside/)
    expect(() => encodeIco([{ size: 16, png: Buffer.from('GIF89a') }])).toThrow(/not a PNG/)
  })
})

describe('readIcoDirectory', () => {
  it('refuses a file that is not an icon', () => {
    expect(() => readIcoDirectory(Buffer.from('<!doctype html>'))).toThrow(/not an icon/)
    expect(() => readIcoDirectory(Buffer.alloc(2))).toThrow(/not an icon/)
  })
})
