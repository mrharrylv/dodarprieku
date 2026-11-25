/**
 * Small helpers for the account pages: which copy a failure gets, and dates
 * written the Latvian way. Only ever used after hydration, so the visitor's
 * clock and time zone are safe to use.
 */

import type { ApiFailureKind } from '@/lib/account-api'

/** `known` failures get their own copy; anything else shares `generic`. */
export const failureKey = (error: ApiFailureKind, known: readonly ApiFailureKind[]): string =>
  known.includes(error) ? error : 'generic'

/** The failures every account call can hit, each with its own copy. */
export const COMMON_FAILURES: readonly ApiFailureKind[] = ['rate_limited', 'network', 'timeout', 'server']

export const formatDate = (iso: string, withTime = false): string => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('lv-LV', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date)
}

export const formatNumber = (n: number): string => new Intl.NumberFormat('lv-LV').format(n)
