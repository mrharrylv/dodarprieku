import type { PledgeRequest, SubscribeRequest } from '@shared/contracts'
import { validatePledge, validateSubscribe, type FieldErrors, type Result } from '@shared/validate'

/** What the pledge dialog holds while the visitor fills it in. */
export interface PledgeDraft {
  readonly anonymous: boolean
  readonly name: string
  readonly email: string
  readonly message: string
  readonly subscribe: boolean
  readonly consent: boolean
  /** The honeypot. A person never sees it, so it stays empty. */
  readonly website: string
}

export const EMPTY_DRAFT: PledgeDraft = {
  anonymous: true,
  name: '',
  email: '',
  message: '',
  subscribe: false,
  consent: false,
  website: '',
}

/**
 * The request the API will accept, or the field errors it would answer with:
 * the same `validatePledge` the API runs, so the form never sends what will be
 * refused. An anonymous pledge drops the name it no longer needs.
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
      ...(draft.anonymous ? {} : { name: draft.name }),
      email: draft.email,
      message: draft.message,
      subscribe: draft.subscribe,
      consent: draft.consent,
      website: draft.website,
    },
    allowedNeedKeys,
  )

export interface SubscribeDraft {
  readonly email: string
  readonly name: string
  readonly consent: boolean
  readonly website: string
}

export const buildSubscribe = (draft: SubscribeDraft, charityId?: string): Result<SubscribeRequest> =>
  validateSubscribe({
    email: draft.email,
    name: draft.name,
    consent: draft.consent,
    website: draft.website,
    ...(charityId !== undefined ? { charityId } : {}),
  })

/** The honeypot was filled: a bot. The form says it could not send, nothing more. */
export const isBot = (fields: FieldErrors): boolean => fields.website !== undefined
