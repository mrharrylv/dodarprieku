import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { LIMITS } from '@shared/contracts'
import { validatePassword } from '@shared/validate'

import { Seo } from '@/components/seo/Seo'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Input } from '@/components/ui/Field'
import { ROUTES } from '@/config/site'
import { useHydrated } from '@/hooks/useHydrated'
import { useLocale } from '@/hooks/useLocale'
import { setPassword, type ApiFailureKind } from '@/lib/account-api'
import { localePath } from '@/lib/locale-path'
import { COMMON_FAILURES, failureKey } from './format'
import { StrengthMeter } from './StrengthMeter'

/**
 * `/konts/parole?token=...`, from the approval or reset email. The token is
 * read only after hydration: the prerendered page has no query string.
 */
export const SetPasswordPage = () => {
  const { t } = useTranslation('account')
  const { locale } = useLocale()
  const hydrated = useHydrated()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = hydrated ? (params.get('token') ?? '').trim() : null
  const [password, setPass] = useState('')
  const [repeat, setRepeat] = useState('')
  const [errors, setErrors] = useState<{ password?: string; repeat?: string }>({})
  const [failure, setFailure] = useState<ApiFailureKind | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!token) return
    const problem = validatePassword(password)
    const found = {
      ...(problem === null ? {} : { password: t(`setPassword.errors.${problem}`, { min: LIMITS.passwordMin, max: LIMITS.passwordMax }) }),
      ...(problem === null && repeat !== password ? { repeat: t('setPassword.errors.mismatch') } : {}),
    }
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setBusy(true)
    setFailure(null)
    const result = await setPassword(token, password)
    setBusy(false)
    if (result.ok) void navigate(localePath(ROUTES.account, locale))
    else setFailure(result.error === 'not_found' || result.error === 'validation' ? 'token_invalid' : result.error)
  }

  const tokenBad = token === '' || failure === 'token_invalid'
  const key = failure === null || failure === 'token_invalid' ? null : failureKey(failure, COMMON_FAILURES)

  return (
    <>
      <Seo title={t('setPassword.meta.title')} description={t('setPassword.meta.description')} path={ROUTES.setPassword} locale={locale} />
      <Container className="py-12 sm:py-16">
        <div className="mx-auto max-w-md">
          <h1 className="font-display text-(length:--text-4xl) text-(--text-primary)">{t('setPassword.title')}</h1>
          {token === null && <p role="status" className="mt-6 text-(--text-muted)">{t('loading')}</p>}
          {tokenBad && (
            <Alert tone="error" title={t('setPassword.tokenInvalid.title')} className="mt-6">
              <p>{t('setPassword.tokenInvalid.body')}</p>
              <Link to={localePath(ROUTES.forgotPassword, locale)} className="mt-2 inline-flex min-h-11 items-center font-medium underline underline-offset-4">
                {t('setPassword.tokenInvalid.link')}
              </Link>
            </Alert>
          )}
          {token && !tokenBad && (
            <form noValidate onSubmit={(e) => void submit(e)}
              className="mt-6 space-y-5 rounded-(--radius-2xl) border border-(--border-subtle) bg-(--surface-raised) p-6 shadow-(--shadow-card) sm:p-8">
              <p className="text-(--text-secondary)">{t('setPassword.intro', { min: LIMITS.passwordMin })}</p>
              {key !== null && <Alert tone="error" title={t(`failures.${key}`)}>{t('setPassword.tryAgain')}</Alert>}
              <div>
                <Input label={t('setPassword.password')} type="password" autoComplete="new-password" required
                  maxLength={LIMITS.passwordMax} value={password} error={errors.password}
                  hint={t('setPassword.hint', { min: LIMITS.passwordMin })} onChange={(e) => setPass(e.target.value)} />
                <StrengthMeter password={password} />
              </div>
              <Input label={t('setPassword.repeat')} type="password" autoComplete="new-password" required
                maxLength={LIMITS.passwordMax} value={repeat} error={errors.repeat} onChange={(e) => setRepeat(e.target.value)} />
              <Button type="submit" className="w-full" loading={busy} loadingLabel={t('setPassword.submitting')}>
                {t('setPassword.submit')}
              </Button>
            </form>
          )}
        </div>
      </Container>
    </>
  )
}
