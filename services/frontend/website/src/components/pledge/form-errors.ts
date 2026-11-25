import type { TFunction } from 'i18next'

/**
 * A field's error code ('required', 'invalid', 'too_long') as copy, from
 * `<prefix>.fieldErrors.<field>.<code>`, falling back to the generic line for
 * a code the copy does not know yet. Never shows a raw code.
 */
export const fieldMessage = (
  t: TFunction,
  prefix: 'pledge' | 'subscribe',
  field: string,
  code: string | undefined,
): string | undefined => {
  if (code === undefined) return undefined
  const generic = t(`${prefix}.fieldErrors.generic`)
  return t(`${prefix}.fieldErrors.${field}.${code}`, { defaultValue: generic })
}
