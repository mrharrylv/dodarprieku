import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { LIMITS } from '@shared/contracts'
import { isEmail } from '@shared/validate'

import { Seo } from '@/components/seo/Seo'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Input } from '@/components/ui/Field'
import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { forgotPassword, type ApiFailureKind } from '@/lib/account-api'
import { localePath } from '@/lib/locale-path'
import { COMMON_FAILURES, failureKey } from './format'

/**
 * `/konts/aizmirsu`: asks for a reset link. The answer is the same whether
 * or not the address has an account, so the page never tells anyone who is
 * registered. Only a request that never reached the API gets an error.
 */
export const ForgotPasswordPage = () => {
  const { t } = useTranslation('account')
  const { locale } = useLocale()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const [failure, setFailure] = useState<ApiFailureKind | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const value = email.trim()
    const problem = value === '' ? t('forgotPassword.errors.required') : isEmail(value) ? undefined : t('forgotPassword.errors.invalid')
    setError(problem)
    if (problem !== undefined) return
    setBusy(true)
    setFailure(null)
    const result = await forgotPassword(value)
    setBusy(false)
    // Anything the API itself answered, apart from the rate limit, gets the same neutral confirmation.
    if (result.ok || !(COMMON_FAILURES as readonly string[]).includes(result.error)) setDone(true)
    else setFailure(result.error)
  }

  return (
    <>
      <Seo title={t('forgotPassword.meta.title')} description={t('forgotPassword.meta.description')} path={ROUTES.forgotPassword} locale={locale} />
      <Container className="py-12 sm:py-16">
        <div className="mx-auto max-w-md">
          <h1 className="font-display text-(length:--text-4xl) text-(--text-primary)">{t('forgotPassword.title')}</h1>
          {done ? (
            <Alert tone="success" title={t('forgotPassword.done.title')} className="mt-6">
              {t('forgotPassword.done.body')}
            </Alert>
          ) : (
            <form noValidate onSubmit={(e) => void submit(e)}
              className="mt-6 space-y-5 rounded-(--radius-2xl) border border-(--border-subtle) bg-(--surface-raised) p-6 shadow-(--shadow-card) sm:p-8">
              <p className="text-(--text-secondary)">{t('forgotPassword.intro')}</p>
              {failure !== null && <Alert tone="error" title={t(`failures.${failureKey(failure, COMMON_FAILURES)}`)}>{t('forgotPassword.tryAgain')}</Alert>}
              <Input label={t('forgotPassword.email')} type="email" autoComplete="email" required maxLength={LIMITS.email}
                value={email} error={error} onChange={(e) => setEmail(e.target.value)} />
              <Button type="submit" className="w-full" loading={busy} loadingLabel={t('forgotPassword.submitting')}>
                {t('forgotPassword.submit')}
              </Button>
            </form>
          )}
          <p className="mt-6 text-center">
            <Link to={localePath(ROUTES.account, locale)} className="inline-flex min-h-11 items-center font-medium text-(--text-accent) underline underline-offset-4">
              {t('forgotPassword.back')}
            </Link>
          </p>
        </div>
      </Container>
    </>
  )
}
