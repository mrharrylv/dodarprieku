/**
 * The one ownership hint the admin has before approving a claim: does the
 * claimant's email belong to the domain of the imported charity's public email
 * or website? It proves nothing either way, and the admin still has to confirm
 * with the charity, but a mismatch is the case that needs a call.
 */
import type { CharityProfile } from '@shared/contracts'

/** Webmail domains: anyone can have an address there, so only the exact address counts. */
const FREE_MAIL = new Set([
  'gmail.com', 'googlemail.com', 'inbox.lv', 'mail.ru', 'yandex.ru', 'yahoo.com', 'outlook.com', 'hotmail.com',
  'live.com', 'icloud.com', 'me.com', 'proton.me', 'protonmail.com', 'gmx.com', 'gmx.net', 'one.lv', 'apollo.lv',
  'tvnet.lv', 'e-pasts.lv', 'navigator.lv',
])

export type ClaimCheck =
  | { readonly kind: 'match'; readonly via: string }
  | { readonly kind: 'mismatch'; readonly claimant: string }
  | { readonly kind: 'no-contacts' }

const domainOf = (email: string): string => email.trim().toLowerCase().split('@')[1] ?? ''

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}

const sameOrSub = (domain: string, base: string): boolean => base !== '' && (domain === base || domain.endsWith(`.${base}`))

export const checkClaim = (claimantEmail: string, imported: CharityProfile): ClaimCheck => {
  const claimant = claimantEmail.trim().toLowerCase()
  const domain = domainOf(claimant)
  const publicEmail = (imported.organization.email ?? '').trim().toLowerCase()
  const site = hostOf(imported.organization.website ?? '')
  if (publicEmail === '' && site === '') return { kind: 'no-contacts' }
  if (publicEmail !== '' && claimant === publicEmail) return { kind: 'match', via: publicEmail }
  if (domain === '' || FREE_MAIL.has(domain)) return { kind: 'mismatch', claimant: domain || claimant }
  const publicDomain = domainOf(publicEmail)
  if (!FREE_MAIL.has(publicDomain) && sameOrSub(domain, publicDomain)) return { kind: 'match', via: publicDomain }
  if (sameOrSub(domain, site)) return { kind: 'match', via: site }
  return { kind: 'mismatch', claimant: domain }
}
