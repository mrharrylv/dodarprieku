/** Pure edits of the sponsor wall. Each returns a new array. */

import { LIMITS, type Sponsor } from '@shared/contracts'

export const canAddSponsor = (sponsors: readonly Sponsor[]): boolean => sponsors.length < LIMITS.maxSponsors

export const addSponsor = (sponsors: readonly Sponsor[]): readonly Sponsor[] =>
  canAddSponsor(sponsors) ? [...sponsors, { name: '' }] : sponsors

export const removeSponsor = (sponsors: readonly Sponsor[], index: number): readonly Sponsor[] =>
  sponsors.filter((_, i) => i !== index)

/** Sets or clears a field; an empty url or logo is removed rather than stored as ''. */
export const updateSponsor = (
  sponsors: readonly Sponsor[],
  index: number,
  field: keyof Sponsor,
  value: string,
): readonly Sponsor[] =>
  sponsors.map((s, i) => {
    if (i !== index) return s
    if (field === 'name') return { ...s, name: value }
    const { [field]: _dropped, ...rest } = s
    return value === '' ? rest : { ...rest, [field]: value }
  })

/** Moves one sponsor up (-1) or down (+1). Out of range changes nothing. */
export const moveSponsor = (sponsors: readonly Sponsor[], index: number, delta: -1 | 1): readonly Sponsor[] => {
  const target = index + delta
  if (index < 0 || index >= sponsors.length || target < 0 || target >= sponsors.length) return sponsors
  return sponsors.map((s, i) => {
    if (i === index) return sponsors[target] as Sponsor
    if (i === target) return sponsors[index] as Sponsor
    return s
  })
}
