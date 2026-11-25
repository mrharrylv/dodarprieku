/** URL slugs from charity names: Latvian letters transliterated, ASCII only. */
import type { Repository } from '../repo/types'

const LATVIAN: Readonly<Record<string, string>> = {
  ā: 'a', č: 'c', ē: 'e', ģ: 'g', ī: 'i', ķ: 'k', ļ: 'l', ņ: 'n', ō: 'o', ŗ: 'r', š: 's', ū: 'u', ž: 'z',
}
const MAX_LENGTH = 60
const FALLBACK = 'organizacija'
const MAX_SUFFIX = 50

export const slugify = (name: string): string => {
  const ascii = [...name.toLowerCase()]
    .map((ch) => LATVIAN[ch] ?? ch)
    .join('')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
  const slug = ascii
    .replace(/["'“”„«»‘’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_LENGTH)
    .replace(/-+$/g, '')
  return slug === '' ? FALLBACK : slug
}

/** Claims `base`, then `base-2`, `base-3`... through the repository's conditional put. */
export const claimUniqueSlug = async (
  repo: Pick<Repository, 'claimSlug'>,
  name: string,
  charityId: string,
  random: () => string,
): Promise<string> => {
  const base = slugify(name)
  for (let n = 1; n <= MAX_SUFFIX; n += 1) {
    const candidate = n === 1 ? base : `${base}-${n}`
    if (await repo.claimSlug(candidate, charityId)) return candidate
  }
  const last = `${base}-${random()}`
  if (await repo.claimSlug(last, charityId)) return last
  throw new Error('could not claim a unique slug')
}
