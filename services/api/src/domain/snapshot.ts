/**
 * The public snapshot, /data/charities.json: every approved charity's public
 * profile plus the sponsor leaderboard. The public map reads only this file.
 */
import type {
  CharityProfile,
  PublicCharity,
  PublicProfile,
  PublicSnapshot,
  SponsorLeaderboardEntry,
} from '../../../shared/src/contracts'
import type { CharityRecord } from '../repo/types'

export const toPublicProfile = (profile: CharityProfile): PublicProfile => {
  const { contactPerson: _private, ...rest } = profile
  return rest
}

const QUOTES = /["'“”„«»‘’`]/g
const LEGAL_AFFIX = /^(sia|as|ltd)\s+|\s+(sia|as|ltd)$/

/** "SIA “Maxima Latvija”" and "maxima latvija sia" are one sponsor. */
export const normaliseSponsorName = (name: string): string => {
  let n = name.toLowerCase().replace(QUOTES, ' ').replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim()
  for (let prev = ''; prev !== n; ) {
    prev = n
    n = n.replace(LEGAL_AFFIX, '').trim()
  }
  return n
}

interface Acc {
  readonly entry: SponsorLeaderboardEntry
  readonly charityIds: ReadonlySet<string>
}

export const buildLeaderboard = (charities: readonly PublicCharity[]): SponsorLeaderboardEntry[] => {
  const groups = new Map<string, Acc>()
  for (const c of charities) {
    for (const s of c.profile.sponsors) {
      const key = normaliseSponsorName(s.name)
      if (key === '') continue
      const old = groups.get(key)
      // Name, url and logo come from the first listing; a later one only fills a gap.
      const prev = old?.entry
      const url = prev?.url ?? s.url
      const logo = prev?.logo ?? s.logo
      const entry: SponsorLeaderboardEntry = {
        name: prev?.name ?? s.name,
        ...(url ? { url } : {}),
        ...(logo ? { logo } : {}),
        charities: 0,
      }
      const charityIds = new Set([...(old?.charityIds ?? []), c.id])
      groups.set(key, { entry: { ...entry, charities: charityIds.size }, charityIds })
    }
  }
  return [...groups.values()]
    .map((g) => g.entry)
    .sort((a, b) => b.charities - a.charities || a.name.localeCompare(b.name, 'lv'))
}

export const buildSnapshot = (charities: readonly CharityRecord[], now: Date): PublicSnapshot => {
  const published: PublicCharity[] = charities
    .filter((c) => c.status === 'approved')
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      profile: toPublicProfile(c.profile),
      publishedAt: c.publishedAt ?? c.updatedAt,
    }))
    .sort((a, b) => a.profile.organization.name.localeCompare(b.profile.organization.name, 'lv'))
  return { generatedAt: now.toISOString(), charities: published, sponsorLeaderboard: buildLeaderboard(published) }
}
