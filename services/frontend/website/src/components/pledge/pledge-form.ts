import type { PledgeRequest, SubscribeRequest } from '@shared/contracts'
import { validatePledge, validateSubscribe, type FieldErrors, type Result } from '@shared/validate'

/** What the pledge dialog holds while the visitor fills it in. */
export interface PledgeDraft {
  readonly anonymous: boolean
  readonly name: string
  /** Shown publicly beside the name: "Vārds (Uzņēmums)". Only with a name. */
  readonly company: string
  readonly email: string
  readonly message: string
  /** "Vēlos saņemt jaunumus par šo iestādi". */
  readonly subscribe: boolean
  /** "Saņemt arī vispārējos jaunumus". */
  readonly general: boolean
  readonly consent: boolean
  /** The honeypot. A person never sees it, so it stays empty. */
  readonly website: string
}

export const EMPTY_DRAFT: PledgeDraft = {
  anonymous: true,
  name: '',
  company: '',
  email: '',
  message: '',
  subscribe: false,
  general: false,
  consent: false,
  website: '',
}

/**
 * The request the API will accept, or the field errors it would answer with:
 * the same `validatePledge` the API runs, so the form never sends what will be
 * refused. An anonymous pledge drops the name and company it no longer needs.
 */
export const buildPledge = (
  draft: PledgeDraft,
  needs: readonly string[],
  allowedNeedKeys: readonly string[],
): Result<PledgeRequest> =>
  validatePledge(
    {
      needs,
      anonymous: draft.anonymous,
      ...(draft.anonymous ? {} : { name: draft.name, company: draft.company }),
      email: draft.email,
      message: draft.message,
      subscribe: draft.subscribe,
      general: draft.general,
      consent: draft.consent,
      website: draft.website,
    },
    allowedNeedKeys,
  )

export interface SubscribeDraft {
  readonly email: string
  readonly name: string
  readonly consent: boolean
  /** "Saņemt arī vispārējos jaunumus": only asked on an organisation's own sign-up. */
  readonly general: boolean
  readonly website: string
}

/** The sign-up as the API takes it: one without an organisation is always the general newsletter. */
export const buildSubscribe = (draft: SubscribeDraft, charityId?: string): Result<SubscribeRequest> =>
  validateSubscribe({
    email: draft.email,
    name: draft.name,
    consent: draft.consent,
    website: draft.website,
    ...(charityId !== undefined ? { charityId, general: draft.general } : { general: true }),
  })

/** The honeypot was filled: a bot. The form says it could not send, nothing more. */
export const isBot = (fields: FieldErrors): boolean => fields.website !== undefined
