import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { LIMITS, type Me } from '@shared/contracts'
import { isEmail } from '@shared/validate'

import { Alert } from '@/components/ui/Alert'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { login, type ApiFailureKind } from '@/lib/account-api'
import { localePath } from '@/lib/locale-path'
import { COMMON_FAILURES, failureKey } from './format'

const LOGIN_FAILURES: readonly ApiFailureKind[] = ['unauthorized', ...COMMON_FAILURES]

/** The login form `/konts` shows when nobody is logged in. */
export const LoginForm = ({ onLoggedIn }: { onLoggedIn: (me: Me) => void }) => {
  const { t } = useTranslation('account')
  const { locale } = useLocale()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [failure, setFailure] = useState<ApiFailureKind | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const found = {
      ...(email.trim() === '' ? { email: t('login.errors.emailRequired') } : isEmail(email.trim()) ? {} : { email: t('login.errors.emailInvalid') }),
      ...(password === '' ? { password: t('login.errors.passwordRequired') } : {}),
    }
    setFieldErrors(found)
    if (Object.keys(found).length > 0) return
    setBusy(true)
    setFailure(null)
    const result = await login(email.trim(), password)
    setBusy(false)
    if (result.ok) onLoggedIn(result.data)
    // A 400 here is the same answer as wrong credentials: nothing to tell apart.
    else setFailure(result.error === 'validation' || result.error === 'bad_request' ? 'unauthorized' : result.error)
  }

  const key = failure === null ? null : failureKey(failure, LOGIN_FAILURES)

  return (
    <div className="mx-auto max-w-md">
      <form noValidate onSubmit={(e) => void submit(e)}
        className="space-y-5 rounded-(--radius-2xl) border border-(--border-subtle) bg-(--surface-raised) p-6 shadow-(--shadow-card) sm:p-8">
        <div>
          <h2 className="font-display text-(length:--text-2xl) text-(--text-primary)">{t('login.title')}</h2>
          <p className="mt-1 text-(--text-secondary)">{t('login.intro')}</p>
        </div>
        {key !== null && <Alert tone="error" title={t(`login.failures.${key}.title`)}>{t(`login.failures.${key}.body`)}</Alert>}
        <Input label={t('login.email')} type="email" autoComplete="username" required maxLength={LIMITS.email}
          value={email} error={fieldErrors.email} onChange={(e) => setEmail(e.target.value)} />
        <Input label={t('login.password')} type="password" autoComplete="current-password" required maxLength={LIMITS.passwordMax}
          value={password} error={fieldErrors.password} onChange={(e) => setPassword(e.target.value)} />
        <Button type="submit" className="w-full" loading={busy} loadingLabel={t('login.submitting')}>
          {t('login.submit')}
        </Button>
        <p className="text-center">
          <Link to={localePath(ROUTES.forgotPassword, locale)} className="inline-flex min-h-11 items-center font-medium text-(--text-accent) underline underline-offset-4">
            {t('login.forgot')}
          </Link>
        </p>
      </form>
      <div className="mt-8 text-center">
        <p className="text-(--text-secondary)">{t('login.notRegistered')}</p>
        <ButtonLink to={localePath(ROUTES.register, locale)} variant="secondary" className="mt-3">
          {t('login.register')}
        </ButtonLink>
      </div>
    </div>
  )
}
