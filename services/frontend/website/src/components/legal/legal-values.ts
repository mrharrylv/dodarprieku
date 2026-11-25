import { ENV } from '@/config/env'
import { CONTACT, COMPANY, DEVELOPER, SITE } from '@/config/site'

/**
 * Values every legal document interpolates.
 *
 * Passed to i18next rather than written into the locale strings, so the company
 * name and registration number appear in `config/site.ts` once instead of
 * twelve times across three languages: where they would inevitably drift.
 */
export const legalValues = () => ({
  legalName: COMPANY.legalName,
  registrationNumber: COMPANY.registrationNumber,
  address: COMPANY.registeredAddress,
  email: CONTACT.email,
  domain: SITE.domain,
  brandName: SITE.name,
  developer: DEVELOPER.name,
  /** Where visit statistics go, as a bare host; '' when they are off. */
  statsHost: ENV.analyticsEndpoint === null ? '' : new URL(ENV.analyticsEndpoint).host,
})

/**
 * The date these documents were last changed.
 *
 * Edited by hand, deliberately: a build date would change on every unrelated
 * deploy and tell the reader that the policy was revised when it was not.
 * Change it in the same commit as any change to the legal copy.
 */
export const LEGAL_LAST_UPDATED = '2026-11-25'
