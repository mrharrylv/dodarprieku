import { useTranslation } from 'react-i18next'

import { useAccountSession } from '@/hooks/useAccountSession'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { DockSkeleton } from '@/components/map/dock/DockSkeleton'
import { Dashboard } from './Dashboard'
import { COMMON_FAILURES, failureKey } from './format'
import { LoginForm } from './LoginForm'

/**
 * "Mans konts" in its panel over the map (`/konts`): the login form, and once
 * logged in the charity's account (status, stats, pledges, the profile editor
 * with the sponsor wall, the list request, logout). The panel only opens in
 * the browser, so the session is asked for at once.
 */
export const AccountPanel = () => {
  const { t } = useTranslation('account')
  const { session, reload, replaceAccount, logout, loggingOut } = useAccountSession(true)

  switch (session.kind) {
    case 'loading':
      // The dock's own placeholder: it is still sliding in, and words swapping for the form would blink in it.
      return <DockSkeleton label={t('loading')} />
    case 'anon':
      return <LoginForm onLoggedIn={reload} />
    case 'error':
      return (
        <Alert tone="error" title={t('loadError.title')}>
          <p>{t(`failures.${failureKey(session.error, COMMON_FAILURES)}`)}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={reload}>{t('retry')}</Button>
        </Alert>
      )
    case 'not_charity':
      return (
        <Alert tone="warning" title={t('notCharity.title')}>
          <p>{t('notCharity.body', { email: session.me.email })}</p>
          <Button variant="secondary" size="sm" className="mt-3" loading={loggingOut} onClick={() => void logout()}>
            {t('logout')}
          </Button>
        </Alert>
      )
    case 'ready':
      return <Dashboard me={session.me} account={session.account} onSaved={replaceAccount} onLogout={logout} loggingOut={loggingOut} />
  }
}
