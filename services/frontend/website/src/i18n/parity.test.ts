import { describe, it, expect } from 'vitest'

import { resources, NAMESPACES, type Namespace } from './index'
import { LOCALE_CODES, DEFAULT_LOCALE, type LocaleCode } from '@/config/site'

/**
 * The locale files must stay key-identical across every language.
 *
 * This is the test that stops the most common i18n failure: a key added to
 * English alone, which renders in English for two thirds of the audience and is
 * noticed months later by a customer rather than by us. It fails the build
 * instead.
 *
 * It also checks that interpolation placeholders survive translation: a
 * translator who drops `{{email}}` produces a sentence that silently omits the
 * address it was supposed to give.
 */

/** Every leaf key path in an object, e.g. `hero.title`. */
const leafKeys = (value: unknown, prefix = ''): string[] => {
  if (typeof value !== 'object' || value === null) return [prefix]

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  )
}

/** Every leaf string value, keyed by its path. */
const leafStrings = (value: unknown, prefix = ''): Array<[string, string]> => {
  if (typeof value === 'string') return [[prefix, value]]
  if (typeof value !== 'object' || value === null) return []

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    leafStrings(child, prefix ? `${prefix}.${key}` : key),
  )
}

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g

const placeholdersIn = (text: string): string[] =>
  [...text.matchAll(PLACEHOLDER)].map((match) => match[1] ?? '').sort()

const bundle = (locale: LocaleCode, ns: Namespace): unknown =>
  resources[locale][ns]

const otherLocales = LOCALE_CODES.filter((code) => code !== DEFAULT_LOCALE)

describe('locale parity', () => {
  it('ships every configured locale', () => {
    for (const code of LOCALE_CODES) {
      expect(resources, `resources is missing the "${code}" locale`).toHaveProperty(code)
    }
  })

  describe.each(NAMESPACES)('namespace "%s"', (ns) => {
    const referenceKeys = leafKeys(bundle(DEFAULT_LOCALE, ns)).sort()

    it('has keys in the default locale', () => {
      expect(referenceKeys.length).toBeGreaterThan(0)
    })

    it.each(otherLocales)(`"%s" has exactly the same keys as "${DEFAULT_LOCALE}"`, (locale) => {
      const keys = leafKeys(bundle(locale, ns)).sort()

      const missing = referenceKeys.filter((key) => !keys.includes(key))
      const extra = keys.filter((key) => !referenceKeys.includes(key))

      expect(missing, `${locale}/${ns}.json is missing keys`).toEqual([])
      expect(extra, `${locale}/${ns}.json has keys ${DEFAULT_LOCALE} does not`).toEqual([])
    })

    it.each(otherLocales)('"%s" keeps every interpolation placeholder', (locale) => {
      const reference = new Map(leafStrings(bundle(DEFAULT_LOCALE, ns)))
      const translated = new Map(leafStrings(bundle(locale, ns)))

      const mismatches = [...reference.entries()].flatMap(([key, text]) => {
        const expected = placeholdersIn(text)
        if (expected.length === 0) return []

        const actual = placeholdersIn(translated.get(key) ?? '')
        return JSON.stringify(expected) === JSON.stringify(actual)
          ? []
          : [`${key}: expected {{${expected.join('}}, {{')}}}, got ${actual.length ? `{{${actual.join('}}, {{')}}}` : 'none'}`]
      })

      expect(mismatches, `${locale}/${ns}.json placeholder mismatch`).toEqual([])
    })

    it.each(otherLocales)('"%s" has no untranslated empty strings', (locale) => {
      const empties = leafStrings(bundle(locale, ns))
        .filter(([, text]) => text.trim().length === 0)
        .map(([key]) => key)

      expect(empties, `${locale}/${ns}.json has empty values`).toEqual([])
    })
  })
})

describe('consent copy', () => {
  /**
   * The privacy-policy link inside the consent checkbox is marked with <1>…</1>
   * and rendered by a <Trans> component. react-i18next indexes those children
   * from 0, so the tag number and the component array must agree: get it wrong
   * and the link renders as plain text in that language only, which is how a
   * consent checkbox quietly stops linking to the policy it references.
   */
  it.each(LOCALE_CODES)('"%s" keeps the privacy link tag in the consent string', (locale) => {
    const contact = resources[locale].contact as { form: { consent: string } }
    const consent = contact.form.consent

    expect(consent, `${locale} consent string lost its <1> tag`).toContain('<1>')
    expect(consent, `${locale} consent string lost its </1> tag`).toContain('</1>')
  })
})
