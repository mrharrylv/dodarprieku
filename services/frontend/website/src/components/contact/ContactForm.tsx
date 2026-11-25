import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { ROUTES, STORAGE_KEYS } from '@/config/site'
import { hasContactBackend, isContactMocked } from '@/config/env'
import { useHydrated } from '@/hooks/useHydrated'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { submitContactForm, type ContactResult } from '@/lib/contact'
import {
  checkRateLimit,
  clearRateLimit,
  recordAttempt,
  retryAfterMinutes,
} from '@/lib/rateLimit'
import {
  validateContactForm,
  type ContactFormValues,
  type FieldErrors,
} from '@/lib/validation'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { ContactFields } from './ContactFields'
import { ContactStatus, type FormState } from './ContactStatus'

const EMPTY: ContactFormValues = {
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
  consent: false,
}

/**
 * Where focus goes after a submit attempt.
 *
 * `firstError` is the accessible convention for a rejected form: land the
 * visitor on the field they have to fix, not on a summary they then have to
 * navigate away from.
 */
/**
 * Where focus goes after the next commit. A fresh object per request, so the
 * effect below runs once for each one and never has to reset it.
 */
type FocusRequest = { readonly target: 'firstError' | 'status' } | null

/**
 * The contact form.
 *
 * This file owns the state machine and the submit path; the markup lives in
 * `ContactFields`, and the outcome message in `ContactStatus`.
 *
 * Every outcome is a value with its own copy. A form that shows a spinner
 * forever, or a bare "error", is the reason someone gives up and phones a
 * competitor instead.
 */
export const ContactForm = () => {
  const { t } = useTranslation('contact')
  const { locale } = useLocale()
  const hydrated = useHydrated()

  const [values, setValues] = useState<ContactFormValues>(EMPTY)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [state, setState] = useState<FormState>('idle')
  const [result, setResult] = useState<ContactResult | null>(null)
  const [blockedMinutes, setBlockedMinutes] = useState(0)
  const [focusRequest, setFocusRequest] = useState<FocusRequest>(null)

  const statusRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  /**
   * Move focus once, after the DOM reflects the new state.
   *
   * An effect, not a `requestAnimationFrame` callback: rAF fires on the
   * browser's schedule, which can land AFTER the visitor has already started
   * typing into the field they were told to fix, and yanking focus mid-word is
   * worse than not moving it at all. An effect runs in the same commit as the
   * render that set the errors, so there is no window for that to happen.
   */
  useEffect(() => {
    if (focusRequest === null) return

    if (focusRequest.target === 'firstError') {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    } else {
      statusRef.current?.focus()
    }
  }, [focusRequest])

  // Never mutate: each change produces a new values object.
  const update = <K extends keyof ContactFormValues>(
    field: K,
    value: ContactFormValues[K],
  ) => {
    setValues((previous) => ({ ...previous, [field]: value }))
    // Clear this field's error as soon as it is touched. A stale error under a
    // field the visitor has just fixed reads as "still wrong".
    setErrors((previous) => {
      if (!(field in previous)) return previous
      const { [field as keyof FieldErrors]: _removed, ...rest } = previous
      return rest
    })
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (state === 'submitting') return

    const validation = validateContactForm(values)
    if (!validation.ok) {
      setErrors(validation.errors)
      setResult({ status: 'invalid', fields: {} })
      setFocusRequest({ target: 'firstError' })
      return
    }

    const limit = checkRateLimit(STORAGE_KEYS.contactRateLimit)
    if (!limit.allowed) {
      setBlockedMinutes(retryAfterMinutes(limit.retryAfterMs))
      setState('blocked')
      setResult(null)
      setFocusRequest({ target: 'status' })
      return
    }

    setState('submitting')
    setErrors({})

    recordAttempt(STORAGE_KEYS.contactRateLimit)
    const outcome = await submitContactForm(values, locale)

    if (outcome.status === 'sent') {
      // A delivered message must not count against the limit, or someone with
      // two genuine enquiries is locked out after the first.
      clearRateLimit(STORAGE_KEYS.contactRateLimit)
      setValues(EMPTY)
    }

    if (outcome.status === 'invalid') {
      setErrors(outcome.fields as FieldErrors)
    }

    setResult(outcome)
    setState('idle')
    // A rejected payload puts the visitor on the field to fix; anything else is
    // a message about the whole attempt, so the status region gets focus.
    setFocusRequest({ target: outcome.status === 'invalid' ? 'firstError' : 'status' })
  }

  const reset = () => {
    setResult(null)
    setErrors({})
    setState('idle')
  }

  /** Error KEYS become sentences here, so the field components stay dumb. */
  const translatedErrors = Object.fromEntries(
    Object.entries(errors).map(([field, key]) => [field, t(key)]),
  ) as Partial<Record<keyof FieldErrors, string>>

  // No endpoint configured: say so and point at the channels that do work,
  // rather than rendering a form whose submit button cannot succeed.
  if (!hasContactBackend()) {
    return (
      <Alert tone="warning" title={t('status.unavailableTitle')}>
        {t('status.unavailableBody')}
      </Alert>
    )
  }

  if (result?.status === 'sent') {
    return (
      <div ref={statusRef} tabIndex={-1} className="focus:outline-none">
        <Alert tone="success" title={t('status.sentTitle')}>
          {t('status.sentBody')}
        </Alert>
        <div className="mt-5">
          <Button variant="secondary" onClick={reset}>
            {t('status.sendAnother')}
          </Button>
        </div>
      </div>
    )
  }

  const submitting = state === 'submitting'
  const mocked = isContactMocked()

  // The page is prerendered, so this markup is on screen before React is.
  // Until React has taken it over (`hydrated`), the fields stay disabled: text
  // typed into them then would never reach `values`, and submitting would say
  // the filled fields are empty. `method="post"` is the second guard: a native
  // submit, if one ever happens, must not put the visitor's details in the URL.
  return (
    <form ref={formRef} method="post" onSubmit={(e) => void onSubmit(e)} noValidate className="space-y-5">
      <div ref={statusRef} tabIndex={-1} className="focus:outline-none">
        <ContactStatus state={state} result={result} blockedMinutes={blockedMinutes} />
      </div>

      <fieldset disabled={submitting || !hydrated} className="space-y-5">
        <legend className="sr-only-focusable">{t('form.legend')}</legend>

        <ContactFields
          values={values}
          errors={translatedErrors}
          privacyHref={localePath(ROUTES.privacy, locale)}
          onChange={update}
        />

        <Button
          type="submit"
          size="lg"
          loading={submitting}
          loadingLabel={t('form.submitting')}
        >
          {t('form.submit')}
        </Button>
      </fieldset>

      {/* Honest about the demo. A "Message sent" that delivered nothing is
          worse than no form; this line is what stops that being a lie. */}
      {mocked && (
        <p className="text-(length:--text-sm) text-(--text-muted)">{t('status.demoNotice')}</p>
      )}
    </form>
  )
}
