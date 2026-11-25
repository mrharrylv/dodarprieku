import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LIMITS } from '@shared/contracts'
import { validatePassword } from '@shared/validate'
import { Button, Field, inputClass } from '../components/ui'
import { useApi } from '../context/api'
import { useAuth } from '../context/auth'
import { fmt, lv } from '../i18n/lv'
import { isApiError } from '../lib/api'
import { errorMessage } from '../lib/errors'
import { PATHS } from '../paths'
import { AuthShell, Notice } from './AuthShell'

const passwordProblem = (password: string, repeat: string): string | undefined => {
  const code = validatePassword(password)
  if (code === 'required' || code === 'too_short') return fmt(lv.auth.tooShort, { n: LIMITS.passwordMin })
  if (code === 'too_long') return lv.auth.tooLong
  return password === repeat ? undefined : lv.auth.mismatch
}

export const SetPasswordPage = () => {
  const api = useApi()
  const { acceptSession } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const problem = passwordProblem(password, repeat)
    if (problem) {
      setError(problem)
      return
    }
    setBusy(true)
    setError(undefined)
    try {
      const me = await api.setPassword({ token, password })
      if (me.role !== 'admin') {
        setError(lv.auth.notAdmin)
        setBusy(false)
        return
      }
      acceptSession(me)
      navigate(PATHS.dashboard, { replace: true })
    } catch (e) {
      setError(isApiError(e) && e.code === 'token_invalid' ? lv.auth.tokenInvalid : errorMessage(e))
      setBusy(false)
    }
  }

  if (token === '') {
    return (
      <AuthShell title={lv.auth.setTitle} intro={lv.auth.setIntro}>
        <Notice tone="error">{lv.auth.noToken}</Notice>
      </AuthShell>
    )
  }

  return (
    <AuthShell title={lv.auth.setTitle} intro={lv.auth.setIntro}>
      {error && <Notice tone="error">{error}</Notice>}
      <form onSubmit={(e) => void submit(e)} className="space-y-4" noValidate>
        <Field label={lv.auth.newPassword} hint={fmt(lv.auth.hint, { n: LIMITS.passwordMin })}>
          {(p) => (
            <input {...p} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
          )}
        </Field>
        <Field label={lv.auth.repeatPassword}>
          {(p) => (
            <input {...p} type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} className={inputClass} />
          )}
        </Field>
        <Button type="submit" variant="primary" className="w-full" disabled={busy}>
          {lv.auth.setSubmit}
        </Button>
      </form>
    </AuthShell>
  )
}
