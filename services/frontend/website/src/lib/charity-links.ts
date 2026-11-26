import { charityPath, ROUTES, type LocaleCode } from '@/config/site'
import { originUrl } from '@/config/env'
import { CLAIM_PARAM, EXPAND_PARAM } from '@/components/charity/focus-param'
import { localePath } from './locale-path'

/** The absolute address that opens the map on this charity with its card expanded: what "Kopēt saiti" copies. */
export const shareUrl = (slug: string, locale: LocaleCode, origin: string = originUrl()): string =>
  `${origin}${localePath(charityPath(slug), locale)}?${EXPAND_PARAM}=1`

/** Where "Pieprasīt profilu" goes: the registration dock, filled in from this charity's public profile. */
export const claimPath = (slug: string, locale: LocaleCode): string =>
  `${localePath(ROUTES.register, locale)}?${CLAIM_PARAM}=${encodeURIComponent(slug)}`
