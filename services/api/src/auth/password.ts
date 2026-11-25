/**
 * scrypt password hashes (N=16384, r=8, p=1, 16-byte salt, 64-byte key),
 * stored as `scrypt$N$r$p$<salt b64>$<hash b64>` so the parameters can change
 * later without breaking existing hashes.
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto'

const PARAMS = { N: 16384, r: 8, p: 1 } as const
const SALT_BYTES = 16
const KEY_BYTES = 64
const SEP = '$'

const scrypt = (password: string, salt: Buffer, keylen: number, opts: ScryptOptions): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key)))
  })

export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(SALT_BYTES)
  const key = await scrypt(password, salt, KEY_BYTES, PARAMS)
  return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64'), key.toString('base64')].join(SEP)
}

interface Parsed {
  readonly N: number
  readonly r: number
  readonly p: number
  readonly salt: Buffer
  readonly key: Buffer
}

const parse = (stored: string): Parsed | undefined => {
  const [scheme, n, r, p, salt, key] = stored.split(SEP)
  if (scheme !== 'scrypt' || !n || !r || !p || !salt || !key) return undefined
  const nums = [Number(n), Number(r), Number(p)]
  if (!nums.every((x) => Number.isInteger(x) && x > 0)) return undefined
  const [N, rr, pp] = nums as [number, number, number]
  return { N, r: rr, p: pp, salt: Buffer.from(salt, 'base64'), key: Buffer.from(key, 'base64') }
}

export const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  const parsed = parse(stored)
  if (!parsed || parsed.key.length === 0) return false
  const key = await scrypt(password, parsed.salt, parsed.key.length, { N: parsed.N, r: parsed.r, p: parsed.p })
  return timingSafeEqual(key, parsed.key)
}

/**
 * A hash nobody's password matches. Login verifies against it when the
 * account does not exist, so a missing account takes as long as a wrong password.
 */
export const DUMMY_HASH = [
  'scrypt',
  PARAMS.N,
  PARAMS.r,
  PARAMS.p,
  Buffer.alloc(SALT_BYTES).toString('base64'),
  Buffer.alloc(KEY_BYTES).toString('base64'),
].join(SEP)
