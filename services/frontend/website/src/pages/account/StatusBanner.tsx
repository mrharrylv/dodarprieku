import { useTranslation } from 'react-i18next'

import type { AccountView } from '@shared/contracts'

import { Alert, type AlertTone } from '@/components/ui/Alert'
import { ButtonLink } from '@/components/ui/Button'
import { charityPath } from '@/config/site'
import { formatDate } from './format'

const TONES: Record<AccountView['status'], AlertTone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  suspended: 'error',
}

/**
 * Where the charity stands: waiting for approval, live (with a link to its
 * public page), rejected or suspended, and whether a change is waiting for the
 * admin. The reason for a suspension is not part of AccountView, so the copy
 * points to the email that carried it.
 */
export const StatusBanner = ({ account }: { account: AccountView }) => {
  const { t } = useTranslation('account')
  return (
    <div className="space-y-3">
      <Alert tone={TONES[account.status]} title={t(`status.${account.status}.title`)}>
        <span className="flex flex-wrap items-center gap-3">
          <span>{t(`status.${account.status}.body`)}</span>
          {account.status === 'approved' && (
            <ButtonLink to={charityPath(account.slug)} variant="secondary" size="sm">
              {t('status.publicLink')}
            </ButtonLink>
          )}
        </span>
      </Alert>
      {account.pendingUpdate && (
        <Alert tone="info" title={t('status.pendingUpdate.title')}>
          {t('status.pendingUpdate.body', { date: formatDate(account.pendingUpdate.submittedAt, true) })}
        </Alert>
      )}
    </div>
  )
}
