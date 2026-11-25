import { describe, it, expect } from 'vitest'

import { FIELD_LIMITS } from '@/config/constants'
import {
  normaliseContactForm,
  validateConsent,
  validateContactForm,
  validateEmail,
  validateMessage,
  validateName,
  validatePhone,
  validateSubject,
  type ContactFormValues,
} from './validation'

const valid: ContactFormValues = {
  name: 'Jane Bērziņa',
  email: 'jane@example.com',
  phone: '+371 20 123 456',
  subject: 'A question',
  message: 'I would like to know more about what you offer.',
  consent: true,
}

describe('validateName', () => {
  it('accepts a normal name', () => {
    expect(validateName('Jane Bērziņa')).toBeNull()
  })

  it('requires a value', () => {
    expect(validateName('')).toBe('errors.name.required')
    expect(validateName('   ')).toBe('errors.name.required')
  })

  it('rejects a single character', () => {
    expect(validateName('J')).toBe('errors.name.tooShort')
  })

  it('rejects a name past the limit', () => {
    expect(validateName('a'.repeat(FIELD_LIMITS.name.max + 1))).toBe('errors.name.tooLong')
  })

  it('measures the collapsed length, not the raw one', () => {
    // Padding a short name with spaces must not sneak past the minimum.
    expect(validateName('  J   ')).toBe('errors.name.tooShort')
  })
})

describe('validateEmail', () => {
  it.each([
    'jane@example.com',
    'jane.doe+tag@sub.example.co.uk',
    "o'brien@example.ie",
    'jānis@example.lv',
  ])('accepts %s', (email) => {
    expect(validateEmail(email)).toBeNull()
  })

  it.each(['jane', 'jane@', '@example.com', 'jane@example', 'jane doe@example.com', 'a@b@c.com'])(
    'rejects %s',
    (email) => {
      expect(validateEmail(email)).not.toBeNull()
    },
  )

  it('requires a value', () => {
    expect(validateEmail('  ')).toBe('errors.email.required')
  })

  it('rejects an address past the limit', () => {
    const long = `${'a'.repeat(FIELD_LIMITS.email.max)}@example.com`
    expect(validateEmail(long)).toBe('errors.email.tooLong')
  })
})

describe('validatePhone', () => {
  it('treats an empty value as valid, because the field is optional', () => {
    expect(validatePhone('')).toBeNull()
    expect(validatePhone('   ')).toBeNull()
  })

  it.each(['+371 20 123 456', '(371) 20-123-456', '20123456', '+44.20.7946.0958'])(
    'accepts %s',
    (phone) => {
      expect(validatePhone(phone)).toBeNull()
    },
  )

  it('rejects letters', () => {
    expect(validatePhone('call me')).toBe('errors.phone.invalid')
  })

  it('rejects too few digits', () => {
    expect(validatePhone('12345')).toBe('errors.phone.tooShort')
  })

  it('rejects a value past the limit', () => {
    expect(validatePhone('1'.repeat(FIELD_LIMITS.phone.max + 1))).toBe('errors.phone.tooLong')
  })
})

describe('validateSubject and validateMessage', () => {
  it('accept normal values', () => {
    expect(validateSubject('A question')).toBeNull()
    expect(validateMessage('Ten chars.')).toBeNull()
  })

  it('reject empty values', () => {
    expect(validateSubject('')).toBe('errors.subject.required')
    expect(validateMessage('')).toBe('errors.message.required')
  })

  it('reject values that are too short', () => {
    expect(validateSubject('a')).toBe('errors.subject.tooShort')
    expect(validateMessage('short')).toBe('errors.message.tooShort')
  })

  it('reject values past the limit', () => {
    expect(validateSubject('a'.repeat(FIELD_LIMITS.subject.max + 1))).toBe(
      'errors.subject.tooLong',
    )
    expect(validateMessage('a'.repeat(FIELD_LIMITS.message.max + 1))).toBe(
      'errors.message.tooLong',
    )
  })
})

describe('validateConsent', () => {
  it('requires an affirmative tick', () => {
    expect(validateConsent(true)).toBeNull()
    expect(validateConsent(false)).toBe('errors.consent.required')
  })
})

describe('validateContactForm', () => {
  it('passes a complete, valid form', () => {
    const result = validateContactForm(valid)
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual({})
  })

  it('reports EVERY problem at once, not just the first', () => {
    const result = validateContactForm({
      name: '',
      email: 'nope',
      phone: 'call me',
      subject: '',
      message: '',
      consent: false,
    })

    expect(result.ok).toBe(false)
    expect(Object.keys(result.errors).sort()).toEqual([
      'consent',
      'email',
      'message',
      'name',
      'phone',
      'subject',
    ])
  })

  it('omits the optional phone when it is blank', () => {
    const result = validateContactForm({ ...valid, phone: '' })
    expect(result.ok).toBe(true)
  })

  it('does not mutate the values it was given', () => {
    const input = { ...valid }
    const snapshot = JSON.stringify(input)
    validateContactForm(input)
    expect(JSON.stringify(input)).toBe(snapshot)
  })
})

describe('normaliseContactForm', () => {
  it('trims and collapses whitespace', () => {
    const result = normaliseContactForm({
      ...valid,
      name: '  Jane   Bērziņa  ',
      subject: ' A   question ',
    })

    expect(result.name).toBe('Jane Bērziņa')
    expect(result.subject).toBe('A question')
  })

  it('lowercases the email, because addresses are compared as strings', () => {
    expect(normaliseContactForm({ ...valid, email: '  Jane@Example.COM ' }).email).toBe(
      'jane@example.com',
    )
  })

  it('keeps the line breaks in the message', () => {
    const message = 'First paragraph.\n\nSecond paragraph.'
    expect(normaliseContactForm({ ...valid, message: `  ${message}  ` }).message).toBe(message)
  })

  it('returns a new object rather than mutating the input', () => {
    const input = { ...valid, name: '  Jane  ' }
    const result = normaliseContactForm(input)

    expect(result).not.toBe(input)
    expect(input.name).toBe('  Jane  ')
  })
})
