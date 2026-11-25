import { describe, it, expect } from 'vitest'

import { resources, NAMESPACES } from './index'
import { LOCALE_CODES } from '@/config/site'

/**
 * House typography rules for visible copy.
 *
 * These are enforced rather than remembered because they are invisible in
 * review: an em dash and a hyphen look near-identical in a diff, and a
 * straight quote inside a JSON string looks like nothing at all. A test is the
 * only thing that reliably keeps them out.
 *
 * Scope is deliberately the locale files only. Source-code comments are not
 * visible text and are none of this test's business.
 */

const leafStrings = (value: unknown, prefix = ''): Array<[string, string]> => {
  if (typeof value === 'string') return [[prefix, value]]
  if (typeof value !== 'object' || value === null) return []

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    leafStrings(child, prefix ? `${prefix}.${key}` : key),
  )
}

const everyString = (): Array<[string, string]> =>
  LOCALE_CODES.flatMap((locale) =>
    NAMESPACES.flatMap((ns) =>
      leafStrings(resources[locale][ns]).map(
        ([key, text]) => [`${locale}/${ns}.json → ${key}`, text] as [string, string],
      ),
    ),
  )

/** U+2014. Written as an escape so the character appears nowhere in this file. */
const EM_DASH = '\u2014'

describe('visible copy', () => {
  /**
   * No em dashes.
   *
   * A house rule, and a deliberate one: the em dash is the punctuation mark
   * that most reliably makes copy read as machine-written. Use a full stop, a
   * colon, a comma, or brackets: each of them says something more specific
   * about the relationship between the clauses than a dash does.
   */
  it('contains no em dashes', () => {
    const offenders = everyString()
      // The character is written as an escape, not as itself. A sweep that
      // removes em dashes from the codebase would otherwise rewrite the
      // literal this test searches for, and the test would then flag every
      // string containing a comma. That has happened once.
      .filter(([, text]) => text.includes(EM_DASH))
      .map(([where, text]) => `${where}: ${text.slice(0, 90)}`)

    expect(
      offenders,
      'Replace the em dash with a full stop, a colon, a comma or brackets',
    ).toEqual([])
  })

  /**
   * No en dashes used as punctuation either. They are permitted inside a
   * numeric or time range, which is what they are actually for.
   */
  it('uses en dashes only inside ranges', () => {
    const offenders = everyString()
      .filter(([, text]) => /(?<![\d\s])–|–(?!\d)/u.test(text))
      .map(([where, text]) => `${where}: ${text.slice(0, 90)}`)

    expect(offenders, 'An en dash belongs in a range (09:00–18:00), not between clauses').toEqual([])
  })

  /** A stray placeholder that reached a translated file is a visible bug. */
  it('carries no leftover TODO or placeholder markers', () => {
    const offenders = everyString()
      .filter(([, text]) => /\b(TODO|FIXME|XXX|LOREM|IPSUM)\b/i.test(text))
      .map(([where]) => where)

    expect(offenders).toEqual([])
  })
})
