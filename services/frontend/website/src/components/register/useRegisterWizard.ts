import { useCallback, useEffect, useState } from 'react'

import type { FieldErrors } from '@shared/validate'

import { EMPTY_FORM, type ProfileForm } from '@/components/profile-editor/form-model'
import { validateSections, validateWholeForm } from '@/components/profile-editor/sections'
import { submitApplication, type ApiFailureKind } from '@/lib/account-api'
import { clearDraft, readDraft, writeDraft } from './draft-storage'
import { REVIEW_STEP, clampStep, mapSubmitErrors, sectionsOfStep, validateReview } from './wizard-steps'

export type SubmitState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'submitting' }
  | { readonly kind: 'failed'; readonly error: ApiFailureKind }
  | { readonly kind: 'done'; readonly email: string }

/**
 * Everything the wizard remembers: the step, the form, the review fields, the
 * errors shown, the submission. `restore` reads the session draft; it is only
 * true once the page has hydrated, because the prerendered page knows nothing
 * of this visitor's storage.
 */
export const useRegisterWizard = (restore: boolean) => {
  const [initial] = useState(() => (restore ? readDraft() : null))
  const [step, setStep] = useState(() => clampStep(initial?.step ?? 0))
  const [furthest, setFurthest] = useState(() => clampStep(initial?.step ?? 0))
  const [form, setForm] = useState<ProfileForm>(initial?.form ?? EMPTY_FORM)
  const [accountEmail, setAccountEmail] = useState(initial?.accountEmail ?? '')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [honeypot, setHoneypot] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [attempt, setAttempt] = useState(0)
  const [submit, setSubmit] = useState<SubmitState>({ kind: 'idle' })
  const [restored, setRestored] = useState(initial !== null)

  // The prerendered pass (restore false) never writes: it would overwrite the
  // visitor's draft with an empty one just before the hydrated wizard reads it.
  useEffect(() => {
    if (restore && submit.kind !== 'done') writeDraft({ version: 1, step, form, accountEmail })
  }, [restore, step, form, accountEmail, submit.kind])

  const update = useCallback((fn: (f: ProfileForm) => ProfileForm) => setForm((f) => fn(f)), [])

  const goTo = (target: number) => {
    const next = clampStep(target)
    if (next > furthest) return
    setErrors({})
    setStep(next)
  }

  const fail = (found: FieldErrors) => {
    setErrors(found)
    setAttempt((n) => n + 1)
  }

  const next = () => {
    const found = validateSections(form, sectionsOfStep(step))
    if (Object.keys(found).length > 0) return fail(found)
    setErrors({})
    // The login email starts as the contact person's, which is usually right.
    if (step + 1 === REVIEW_STEP && accountEmail === '') setAccountEmail(form.contactPerson.email.trim())
    const target = clampStep(step + 1)
    setStep(target)
    setFurthest((f) => Math.max(f, target))
  }

  const back = () => goTo(step - 1)

  const send = async () => {
    const own = validateReview({ accountEmail, acceptTerms })
    const whole = validateWholeForm(form)
    if (!whole.ok || Object.keys(own).length > 0) {
      const mapped = mapSubmitErrors({ ...(whole.ok ? {} : whole.fields), ...own })
      setStep(mapped.step)
      return fail(mapped.errors)
    }
    setSubmit({ kind: 'submitting' })
    const result = await submitApplication({
      profile: whole.profile,
      accountEmail: accountEmail.trim(),
      acceptTerms: true,
      ...(honeypot === '' ? {} : { website: honeypot }),
    })
    if (result.ok) {
      clearDraft()
      setSubmit({ kind: 'done', email: accountEmail.trim() })
      return
    }
    setSubmit({ kind: 'failed', error: result.error })
    if (result.error === 'validation' && result.fields) {
      const mapped = mapSubmitErrors(result.fields)
      setStep(mapped.step)
      fail(mapped.errors)
    }
  }

  const startOver = () => {
    clearDraft()
    setForm(EMPTY_FORM)
    setAccountEmail('')
    setAcceptTerms(false)
    setErrors({})
    setStep(0)
    setFurthest(0)
    setRestored(false)
    setSubmit({ kind: 'idle' })
  }

  return {
    step, furthest, form, update, errors, attempt, submit, restored,
    accountEmail, setAccountEmail, acceptTerms, setAcceptTerms, honeypot, setHoneypot,
    next, back, goTo, send, startOver, dismissRestored: () => setRestored(false),
  }
}

export type RegisterWizardState = ReturnType<typeof useRegisterWizard>
