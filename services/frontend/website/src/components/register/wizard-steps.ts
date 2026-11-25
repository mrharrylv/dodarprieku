/**
 * The wizard's six steps (doc/specs/dodarprieku.md, flow 1) and how a
 * submission's field errors map back onto them.
 */

import { isEmail, type FieldErrors } from '@shared/validate'

import type { ProfileSection } from '@/components/profile-editor/sections'
import { sectionOf } from '@/components/profile-editor/sections'

export const WIZARD_STEPS = ['organization', 'about', 'location', 'needs', 'delivery', 'review'] as const
export type WizardStep = (typeof WIZARD_STEPS)[number]
export const REVIEW_STEP = WIZARD_STEPS.length - 1

/** The profile sections a step checks; the review step checks its own fields. */
export const sectionsOfStep = (step: number): readonly ProfileSection[] => {
  const id = WIZARD_STEPS[step]
  return id === undefined || id === 'review' ? [] : [id]
}

export const clampStep = (step: number): number => Math.min(Math.max(0, Math.trunc(step)), REVIEW_STEP)

export interface ReviewFields {
  readonly accountEmail: string
  readonly acceptTerms: boolean
}

export const validateReview = ({ accountEmail, acceptTerms }: ReviewFields): FieldErrors => {
  const email = accountEmail.trim()
  return {
    ...(email === '' ? { accountEmail: 'required' } : isEmail(email) ? {} : { accountEmail: 'invalid' }),
    ...(acceptTerms ? {} : { acceptTerms: 'required' }),
  }
}

/**
 * The API reports profile errors as `profile.<path>`. This strips the prefix,
 * drops the honeypot, and says which step to send the person back to.
 */
export const mapSubmitErrors = (fields: FieldErrors): { readonly errors: FieldErrors; readonly step: number } => {
  const errors = Object.fromEntries(
    Object.entries(fields)
      .filter(([path]) => path !== 'website')
      .map(([path, code]) => [path.replace(/^profile\./, ''), code]),
  )
  const steps = Object.keys(errors).map((path) => {
    const section = sectionOf(path)
    const index = section === undefined ? -1 : WIZARD_STEPS.indexOf(section as WizardStep)
    return index === -1 ? REVIEW_STEP : index
  })
  return { errors, step: steps.length === 0 ? REVIEW_STEP : Math.min(...steps) }
}
