/** Maps any thrown value to Latvian copy the admin can act on. */
import { lv } from '../i18n/lv'
import { isApiError, type ClientErrorCode } from './api'

export const messageForCode = (code: ClientErrorCode): string => lv.errors[code]

export const errorMessage = (error: unknown): string =>
  isApiError(error) ? messageForCode(error.code) : lv.errors.server

export const fieldErrorMessage = (code: string): string =>
  code in lv.fieldErrors ? lv.fieldErrors[code as keyof typeof lv.fieldErrors] : lv.fieldErrors.fallback
