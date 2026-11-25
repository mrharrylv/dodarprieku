import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { useAccountSession } from '@/hooks/useAccountSession'
import { useHydrated } from '@/hooks/useHydrated'
import { useLocale } from '@/hooks/useLocale'
import { Seo } from '@/components/seo/Seo'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Dashboard } from './Dashboard'
import { COMMON_FAILURES, failureKey } from './format'
import { LoginForm } from './LoginForm'

/**
 * `/konts`: the charity's dashboard, or the login form when nobody is logged
 * in. Prerendered as the loading state; the session is asked for only after
 * hydration.
 */
export const AccountPage = () => {
  const { t } = useTranslation('account')
  const { locale } = useLocale()
  const hydrated = useHydrated()
  const { session, reload, replaceAccount, logout, loggingOut } = useAccountSession(hydrated)

  const body = () => {
    switch (session.kind) {
      case 'loading':
        return <p role="status" className="py-16 text-center text-(--text-muted)">{t('loading')}</p>
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

  return (
    <>
      <Seo title={t('meta.title')} description={t('meta.description')} path={ROUTES.account} locale={locale} />
      <Container className="py-12 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <h1 className="mb-8 font-display text-(length:--text-4xl) text-(--text-primary)">{t('title')}</h1>
          {body()}
        </div>
      </Container>
    </>
  )
}
