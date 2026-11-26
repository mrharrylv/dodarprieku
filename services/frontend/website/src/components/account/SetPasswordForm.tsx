import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { LIMITS } from '@shared/contracts'
import { validatePassword } from '@shared/validate'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { setPassword, type ApiFailureKind } from '@/lib/account-api'
import { localePath } from '@/lib/locale-path'
import { COMMON_FAILURES, failureKey } from './format'
import { StrengthMeter } from './StrengthMeter'

/**
 * The account panel at `/konts/parole?token=...`, the link in the approval and
 * reset emails. The panel opens only in the browser, so the token is read at once.
 * A saved password logs the charity in and shows its account.
 */
export const SetPasswordForm = () => {
  const { t } = useTranslation('account')
  const { locale } = useLocale()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = (params.get('token') ?? '').trim()
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
    <div className="mx-auto max-w-md">
      {tokenBad ? (
        <Alert tone="error" title={t('setPassword.tokenInvalid.title')}>
          <p>{t('setPassword.tokenInvalid.body')}</p>
          <Link to={localePath(ROUTES.forgotPassword, locale)} className="mt-2 inline-flex min-h-11 items-center font-medium underline underline-offset-4">
            {t('setPassword.tokenInvalid.link')}
          </Link>
        </Alert>
      ) : (
        <form noValidate onSubmit={(e) => void submit(e)}
          className="space-y-5 rounded-(--radius-2xl) border border-(--border-subtle) bg-(--surface-raised) p-6 shadow-(--shadow-card) sm:p-8">
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
  )
}
