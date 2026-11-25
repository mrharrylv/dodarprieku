import { describe, expect, it } from 'vitest'
import { LIMITS } from '../../../shared/src/contracts'
import { createMemoryRepository } from '../repo/memory'
import { putCharity, createTestDeps, validProfile } from '../test/helpers'
import { RATE_LIMITS, checkRateLimit, windowStart } from './ratelimit'
import { claimUniqueSlug, slugify } from './slug'
import { buildLeaderboard, buildSnapshot, normaliseSponsorName, toPublicProfile } from './snapshot'
import { decodeUpload, sniffContentType, uploadKey } from './upload'

describe('slugify', () => {
  it('transliterates Latvian and drops quotes and punctuation', () => {
    expect(slugify('Dzīvnieku patversme “Ķepa”')).toBe('dzivnieku-patversme-kepa')
    expect(slugify('Biedrība "Ģimeņu Atbalsts" – Rēzekne!')).toBe('biedriba-gimenu-atbalsts-rezekne')
    expect(slugify('ČŠŽ ĀĒĪŪ ĻŅ')).toBe('csz-aeiu-ln')
    expect(slugify('Café Noël')).toBe('cafe-noel')
  })

  it('falls back and caps the length', () => {
    expect(slugify('“”!!')).toBe('organizacija')
    const long = slugify('a '.repeat(80))
    expect(long.length).toBeLessThanOrEqual(60)
    expect(long.endsWith('-')).toBe(false)
  })

  it('claims -2, -3 when taken, then a random suffix', async () => {
    const repo = createMemoryRepository()
    expect(await claimUniqueSlug(repo, 'Ķepa', 'a', () => 'r')).toBe('kepa')
    expect(await claimUniqueSlug(repo, 'Ķepa', 'b', () => 'r')).toBe('kepa-2')
    expect(await claimUniqueSlug(repo, 'Ķepa', 'c', () => 'r')).toBe('kepa-3')
    const full = { claimSlug: async (s: string) => s === 'x-zz' }
    expect(await claimUniqueSlug(full, 'x', 'd', () => 'zz')).toBe('x-zz')
    await expect(claimUniqueSlug({ claimSlug: async () => false }, 'x', 'e', () => 'zz')).rejects.toThrow()
  })
})

describe('snapshot', () => {
  it('normalises sponsor names', () => {
    expect(normaliseSponsorName('SIA “Labie Kaimiņi”')).toBe('labie kaimiņi')
    expect(normaliseSponsorName('"labie   kaimiņi" sia')).toBe('labie kaimiņi')
    expect(normaliseSponsorName('Labie Kaimiņi Ltd.')).toBe('labie kaimiņi')
    expect(normaliseSponsorName('AS Ziemeļu Maiznīca')).toBe('ziemeļu maiznīca')
    expect(normaliseSponsorName('SIA')).toBe('sia')
    expect(normaliseSponsorName('Asins donori')).toBe('asins donori')
  })

  it('drops the contact person from public profiles', () => {
    expect(toPublicProfile(validProfile())).not.toHaveProperty('contactPerson')
  })

  it('ranks sponsors by distinct charities, first listing wins, gaps filled', () => {
    const p = (sponsors: { name: string; url?: string; logo?: string }[]) => ({
      ...toPublicProfile(validProfile()),
      sponsors,
    })
    const board = buildLeaderboard([
      { id: 'a', slug: 'a', publishedAt: '', profile: p([{ name: 'SIA Alfa' }, { name: 'Alfa' }, { name: '“”' }]) },
      { id: 'b', slug: 'b', publishedAt: '', profile: p([{ name: 'Alfa SIA', url: 'https://alfa.lv', logo: 'l.png' }, { name: 'Beta' }]) },
      { id: 'c', slug: 'c', publishedAt: '', profile: p([{ name: 'alfa', url: 'https://other.lv' }, { name: 'Ābele' }]) },
    ])
    expect(board).toEqual([
      { name: 'SIA Alfa', url: 'https://alfa.lv', logo: 'l.png', charities: 3 },
      { name: 'Ābele', charities: 1 },
      { name: 'Beta', charities: 1 },
    ])
  })

  it('includes only approved charities, sorted by name', async () => {
    const deps = createTestDeps()
    const a = await putCharity(deps, { id: 'a', slug: 'a', profile: validProfile({ organization: { ...validProfile().organization, name: 'Zīle' } }) })
    await putCharity(deps, { id: 'b', slug: 'b', status: 'pending' })
    const c = await putCharity(deps, { id: 'c', slug: 'c', profile: validProfile({ organization: { ...validProfile().organization, name: 'Ābols' } }) })
    const { publishedAt: _x, ...noPublished } = c
    const snap = buildSnapshot([a, noPublished, await deps.repo.getCharity('b')].filter((x) => x !== undefined), deps.now())
    expect(snap.charities.map((x) => x.id)).toEqual(['c', 'a'])
    expect(snap.charities[0]!.publishedAt).toBe(c.updatedAt)
    expect(snap.generatedAt).toBe('2026-11-25T10:00:00.000Z')
    expect(snap.sponsorLeaderboard[0]).toMatchObject({ charities: 2 })
  })
})

const b64 = (bytes: number[], pad = 16): string => Buffer.from([...bytes, ...new Array(pad).fill(0)]).toString('base64')
const JPEG = [0xff, 0xd8, 0xff, 0xe0]
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const WEBP = [...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBP')]

describe('uploads', () => {
  it('sniffs magic bytes', () => {
    expect(sniffContentType(new Uint8Array(JPEG))).toBe('image/jpeg')
    expect(sniffContentType(new Uint8Array(PNG))).toBe('image/png')
    expect(sniffContentType(new Uint8Array(WEBP))).toBe('image/webp')
    expect(sniffContentType(new Uint8Array([1, 2, 3]))).toBeUndefined()
    expect(sniffContentType(new Uint8Array([...Buffer.from('RIFF')]))).toBeUndefined()
  })

  it('decodes matching data, with or without a data: prefix', () => {
    const r = decodeUpload(b64(PNG), 'image/png')
    expect(r.ok && r.bytes.length).toBe(24)
    expect(decodeUpload(`data:image/jpeg;base64,${b64(JPEG)}`, 'image/jpeg').ok).toBe(true)
  })

  it('refuses a type mismatch, bad base64 and oversize', () => {
    expect(decodeUpload(b64(PNG), 'image/jpeg')).toEqual({ ok: false, error: 'type_mismatch' })
    expect(decodeUpload('not*base64', 'image/png')).toEqual({ ok: false, error: 'invalid' })
    expect(decodeUpload('', 'image/png')).toEqual({ ok: false, error: 'invalid' })
    expect(decodeUpload('abc', 'image/png')).toEqual({ ok: false, error: 'invalid' })
    const big = Buffer.alloc(LIMITS.uploadMaxBytes + 10).toString('base64')
    expect(decodeUpload(big, 'image/png')).toEqual({ ok: false, error: 'too_large' })
  })

  it('refuses a payload that decodes past the limit', () => {
    const justOver = Buffer.alloc(LIMITS.uploadMaxBytes + 1).toString('base64')
    expect(decodeUpload(justOver, 'image/png')).toEqual({ ok: false, error: 'too_large' })
  })

  it('builds keys by year and month', () => {
    expect(uploadKey(new Date('2026-03-05T00:00:00Z'), 'abc12345', 'image/webp')).toBe('uploads/2026/03/abc12345.webp')
  })
})

describe('rate limits', () => {
  const now = new Date('2026-11-25T10:20:00Z')

  it('uses fixed windows', () => {
    expect(windowStart(now, 3_600_000)).toBe(Date.parse('2026-11-25T10:00:00Z'))
  })

  it('allows up to the limit per scope and hashed ip, then refuses', async () => {
    const repo = createMemoryRepository()
    const results = []
    for (let i = 0; i < RATE_LIMITS.forgot.limit + 1; i += 1) results.push(await checkRateLimit(repo, 'forgot', 'h1', now))
    expect(results.filter(Boolean)).toHaveLength(RATE_LIMITS.forgot.limit)
    expect(results.at(-1)).toBe(false)
    expect(await checkRateLimit(repo, 'forgot', 'h2', now)).toBe(true)
    expect(await checkRateLimit(repo, 'login', 'h1', now)).toBe(true)
    expect(await checkRateLimit(repo, 'forgot', 'h1', new Date('2026-11-25T11:00:00Z'))).toBe(true)
  })

  it('stores the window start and an expiry two windows later', async () => {
    const calls: unknown[][] = []
    await checkRateLimit({ hitRateLimit: async (...a) => (calls.push(a), 1) }, 'login', 'h', now)
    expect(calls[0]).toEqual(['login#h', '2026-11-25T10:15:00.000Z', Date.parse('2026-11-25T10:45:00Z') / 1000])
  })
})
