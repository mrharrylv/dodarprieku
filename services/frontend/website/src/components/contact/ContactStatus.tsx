import { useTranslation } from 'react-i18next'

import type { ContactResult } from '@/lib/contact'
import { Alert } from '@/components/ui/Alert'

/** Whether the form is idle, in flight, or locally throttled. */
export type FormState = 'idle' | 'submitting' | 'blocked'

/**
 * The one message above the form that says what just happened.
 *
 * Every outcome gets its own tone and its own copy, because they ask different
 * things of the reader: a timeout is worth retrying, a 5xx is our fault and is
 * not, a local throttle needs them to wait, and an unconfigured endpoint means
 * they should pick up the phone instead. Collapsing these into one "something
 * went wrong" is how a form loses an enquiry silently.
 */
export const ContactStatus = ({
  state,
  result,
  blockedMinutes,
}: {
  state: FormState
  result: ContactResult | null
  blockedMinutes: number
}) => {
  const { t } = useTranslation('contact')

  if (state === 'blocked') {
    return (
      <Alert tone="warning" title={t('status.rateLimitedTitle')}>
        {t('status.rateLimitedBody', { minutes: blockedMinutes })}
      </Alert>
    )
  }

  // Success replaces the whole form, so it is not rendered here.
  if (result === null || result.status === 'sent') return null

  if (result.status === 'invalid') {
    return (
      <Alert tone="error" title={t('status.invalidTitle')}>
        {t('status.invalidBody')}
      </Alert>
    )
  }

  if (result.status === 'rate-limited') {
    return (
      <Alert tone="warning" title={t('status.rateLimitedTitle')}>
        {t('status.rateLimitedBody', {
          minutes: Math.max(1, Math.ceil(result.retryAfterSeconds / 60)),
        })}
      </Alert>
    )
  }

  if (result.status === 'unavailable') {
    return (
      <Alert tone="warning" title={t('status.unavailableTitle')}>
        {t('status.unavailableBody')}
      </Alert>
    )
  }

  return (
    <Alert tone="error" title={t(`status.${result.reason}Title`)}>
      {t(`status.${result.reason}Body`)}
    </Alert>
  )
}
