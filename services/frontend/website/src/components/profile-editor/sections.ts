/**
 * Which part of the profile each form section owns, so the shared
 * `validateProfile` can check one wizard step or one editor tab at a time:
 * the whole profile is validated and only the errors under the section's
 * field paths are kept.
 */

import { validateProfile, type FieldErrors } from '@shared/validate'
import type { CharityProfile } from '@shared/contracts'

import { formToProfileInput, type ProfileForm } from './form-model'

export const PROFILE_SECTIONS = ['organization', 'about', 'location', 'needs', 'delivery', 'sponsors'] as const
export type ProfileSection = (typeof PROFILE_SECTIONS)[number]

const PREFIXES: Record<ProfileSection, readonly string[]> = {
  organization: ['organization', 'contactPerson'],
  about: ['category', 'description', 'photos', 'logo'],
  location: ['address', 'location'],
  needs: ['needs'],
  delivery: ['delivery'],
  sponsors: ['sponsors'],
}

const under = (path: string, prefix: string): boolean => path === prefix || path.startsWith(`${prefix}.`)

export const sectionOf = (path: string): ProfileSection | undefined =>
  PROFILE_SECTIONS.find((section) => PREFIXES[section].some((prefix) => under(path, prefix)))

export const errorsInSection = (fields: FieldErrors, section: ProfileSection): FieldErrors =>
  Object.fromEntries(Object.entries(fields).filter(([path]) => sectionOf(path) === section))

/** The errors of the given sections only (one wizard step, or everything up to it). */
export const validateSections = (form: ProfileForm, sections: readonly ProfileSection[]): FieldErrors => {
  const result = validateProfile(formToProfileInput(form))
  if (result.ok) return {}
  return Object.fromEntries(
    Object.entries(result.fields).filter(([path]) => {
      const section = sectionOf(path)
      return section !== undefined && sections.includes(section)
    }),
  )
}

export type FullValidation =
  | { readonly ok: true; readonly profile: CharityProfile }
  | { readonly ok: false; readonly fields: FieldErrors; readonly firstSection: ProfileSection | undefined }

/** The whole profile, with the first section (in form order) that has a problem. */
export const validateWholeForm = (form: ProfileForm): FullValidation => {
  const result = validateProfile(formToProfileInput(form))
  if (result.ok) return { ok: true, profile: result.value }
  const firstSection = PROFILE_SECTIONS.find((section) => Object.keys(errorsInSection(result.fields, section)).length > 0)
  return { ok: false, fields: result.fields, firstSection }
}

/**
 * The translation keys for one error, most specific first: a copy for this
 * field and code (`errors.fields.needs.n.customLabel.required`, list indexes
 * written as `n`), then the code's generic copy (`errors.required`).
 */
export const errorKeys = (path: string, code: string): string[] => {
  const pattern = path.replace(/\.\d+(?=\.|$)/g, '.n')
  return [`errors.fields.${pattern}.${code}`, `errors.${code}`, 'errors.invalid']
}
