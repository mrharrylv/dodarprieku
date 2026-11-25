/**
 * A rough strength hint for a new password. Only a hint: the rule the API
 * enforces is `validatePassword` (@shared/validate), length between
 * `LIMITS.passwordMin` and `LIMITS.passwordMax`.
 */

import { LIMITS } from '@shared/contracts'

export type Strength = 'empty' | 'too_short' | 'weak' | 'fair' | 'good' | 'strong'

const LONG = 16

export const passwordStrength = (password: string): Strength => {
  if (password === '') return 'empty'
  if (password.length < LIMITS.passwordMin) return 'too_short'
  const variety = [/[a-zāčēģīķļņšūž]/, /[A-ZĀČĒĢĪĶĻŅŠŪŽ]/, /[0-9]/, /[^\p{L}0-9]/u].filter((re) => re.test(password)).length
  const repeated = /^(.)\1+$/.test(password)
  if (repeated) return 'weak'
  const score = variety + (password.length >= LONG ? 2 : password.length >= LIMITS.passwordMin + 2 ? 1 : 0)
  if (score >= 5) return 'strong'
  if (score >= 4) return 'good'
  if (score >= 2) return 'fair'
  return 'weak'
}

/** How much of the meter to fill, 0 to 4. */
export const strengthLevel = (strength: Strength): number =>
  ({ empty: 0, too_short: 0, weak: 1, fair: 2, good: 3, strong: 4 })[strength]
