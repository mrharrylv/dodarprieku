import { FIELD_LIMITS } from '@/config/constants'

/**
 * Boundary validation for the contact form.
 *
 * Pure and synchronous: no i18n, no React, no DOM. Errors come back as stable
 * KEYS, and the component looks the message up in the current locale. Returning
 * an English sentence from here would make the form untranslatable.
 *
 * This runs on untrusted input and is the last thing between a visitor's typing
 * and a network request. The endpoint validates independently: client-side
 * validation is a courtesy to the visitor, never a security control.
 */

export type ContactField = 'name' | 'email' | 'phone' | 'subject' | 'message'

export interface ContactFormValues {
  name: string
  email: string
  phone: string
  subject: string
  message: string
  consent: boolean
}

/** Field name → error key, e.g. `{ email: 'errors.email.invalid' }`. */
export type FieldErrors = Partial<Record<ContactField | 'consent', string>>

export interface ValidationResult {
  readonly ok: boolean
  readonly errors: FieldErrors
}

/**
 * Deliberately permissive: one @, a dot in the domain, no whitespace.
 *
 * Chasing RFC 5322 with a regex is a well-known way to reject real addresses
 * (apostrophes, plus-addressing, new TLDs) while still not proving the mailbox
 * exists. Only delivery proves that. Catch the typo, let the rest through.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

/** Digits, spaces, and the punctuation real phone numbers are written with. */
const PHONE_PATTERN = /^[+]?[\d\s()./-]+$/

/** Collapses runs of whitespace so " a  b " and "a b" count the same length. */
const normalise = (value: string): string => value.trim().replace(/\s+/g, ' ')

const lengthError = (
  value: string,
  { min, max }: { min: number; max: number },
  field: string,
): string | null => {
  if (value.length === 0) return `errors.${field}.required`
  if (value.length < min) return `errors.${field}.tooShort`
  if (value.length > max) return `errors.${field}.tooLong`
  return null
}

export const validateName = (raw: string): string | null =>
  lengthError(normalise(raw), FIELD_LIMITS.name, 'name')

export const validateEmail = (raw: string): string | null => {
  const value = raw.trim()
  const lengthProblem = lengthError(value, FIELD_LIMITS.email, 'email')
  if (lengthProblem) return lengthProblem
  return EMAIL_PATTERN.test(value) ? null : 'errors.email.invalid'
}

/**
 * Phone is optional. An empty string is valid; anything present must look like
 * a phone number and carry at least 6 digits.
 */
export const validatePhone = (raw: string): string | null => {
  const value = raw.trim()
  if (value.length === 0) return null
  if (value.length > FIELD_LIMITS.phone.max) return 'errors.phone.tooLong'
  if (!PHONE_PATTERN.test(value)) return 'errors.phone.invalid'

  const digits = value.replace(/\D/g, '')
  return digits.length >= FIELD_LIMITS.phone.min ? null : 'errors.phone.tooShort'
}

export const validateSubject = (raw: string): string | null =>
  lengthError(normalise(raw), FIELD_LIMITS.subject, 'subject')

export const validateMessage = (raw: string): string | null =>
  lengthError(normalise(raw), FIELD_LIMITS.message, 'message')

/**
 * Consent must be affirmative, given by an unticked box the visitor ticks.
 * A pre-ticked box is not consent under GDPR Art. 4(11) (Planet49, C-673/17).
 */
export const validateConsent = (given: boolean): string | null =>
  given ? null : 'errors.consent.required'

/**
 * Validate the whole form. Returns every error at once rather than stopping at
 * the first: showing one problem, then another after the fix, then a third, is
 * how people give up on a form.
 */
export const validateContactForm = (
  values: ContactFormValues,
): ValidationResult => {
  const candidates: Array<[ContactField | 'consent', string | null]> = [
    ['name', validateName(values.name)],
    ['email', validateEmail(values.email)],
    ['phone', validatePhone(values.phone)],
    ['subject', validateSubject(values.subject)],
    ['message', validateMessage(values.message)],
    ['consent', validateConsent(values.consent)],
  ]

  const errors = candidates.reduce<FieldErrors>((acc, [field, error]) => {
    // Build a new object each time, never mutate the accumulator in place.
    return error === null ? acc : { ...acc, [field]: error }
  }, {})

  return { ok: Object.keys(errors).length === 0, errors }
}

/**
 * Trim and collapse whitespace on every field before submission.
 *
 * Returns a NEW object; the caller's values are untouched.
 */
export const normaliseContactForm = (
  values: ContactFormValues,
): ContactFormValues => ({
  name: normalise(values.name),
  email: values.email.trim().toLowerCase(),
  phone: values.phone.trim(),
  subject: normalise(values.subject),
  // The message keeps its line breaks: collapsing them would destroy the
  // paragraphs someone deliberately typed.
  message: values.message.trim(),
  consent: values.consent,
})
