import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { AccountView, Me } from '@shared/contracts'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import type { ApiFailureKind } from '@/lib/account-api'
import { COMMON_FAILURES, failureKey } from './format'
import { ListRequestPanel } from './ListRequestPanel'
import { PledgeList } from './PledgeList'
import { ProfileEditor } from './ProfileEditor'
import { StatsPanel } from './StatsPanel'
import { StatusBanner } from './StatusBanner'

/** The logged-in charity's page: status, numbers, pledges, the editor, the list request, logout. */
export const Dashboard = ({
  me,
  account,
  onSaved,
  onLogout,
  loggingOut,
}: {
  me: Me
  account: AccountView
  onSaved: (account: AccountView) => void
  onLogout: () => Promise<ApiFailureKind | null>
  loggingOut: boolean
}) => {
  const { t } = useTranslation('account')
  const [logoutError, setLogoutError] = useState<ApiFailureKind | null>(null)

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-(length:--text-sm) text-(--text-muted)">{t('signedInAs', { email: me.email })}</p>
          <h2 className="font-display text-(length:--text-3xl) text-(--text-primary)">{account.profile.organization.name}</h2>
        </div>
        <Button variant="secondary" loading={loggingOut} loadingLabel={t('loggingOut')}
          onClick={() => void onLogout().then(setLogoutError)}>
          {t('logout')}
        </Button>
      </div>
      {logoutError !== null && (
        <Alert tone="error" title={t('logoutFailed')}>{t(`failures.${failureKey(logoutError, COMMON_FAILURES)}`)}</Alert>
      )}
      <StatusBanner account={account} />
      <StatsPanel account={account} />
      <PledgeList profile={account.profile} />
      <ProfileEditor account={account} onSaved={onSaved} />
      <ListRequestPanel lastRequestAt={account.lastListRequestAt} subscribers={account.stats.subscribers} />
    </div>
  )
}
