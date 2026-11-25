import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import type { FieldErrors } from '@shared/validate'
import { LIMITS } from '@shared/contracts'

import { errorKeys } from './sections'

/**
 * Turns the validator's codes into Latvian copy: `error('organization.email')`
 * is the sentence to show under that field, or undefined when it is fine.
 */
export const useFieldError = (errors: FieldErrors) => {
  const { t } = useTranslation('register')
  return useCallback(
    (path: string): string | undefined => {
      const code = errors[path]
      return code === undefined ? undefined : t(errorKeys(path, code), { ...LIMITS })
    },
    [errors, t],
  )
}
