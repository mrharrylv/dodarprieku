import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Button, Field, inputClass } from '../components/ui'
import { NotAdminError, useAuth } from '../context/auth'
import { lv } from '../i18n/lv'
import { isApiError } from '../lib/api'
import { errorMessage } from '../lib/errors'
import { PATHS } from '../paths'
import { AuthShell, Notice } from './AuthShell'

const loginError = (error: unknown): string => {
  if (error instanceof NotAdminError) return lv.auth.notAdmin
  if (isApiError(error) && (error.code === 'unauthorized' || error.code === 'validation' || error.code === 'bad_request')) {
    return lv.auth.wrong
  }
  if (isApiError(error) && error.code === 'forbidden') return lv.auth.notAdmin
  return errorMessage(error)
}

export const LoginPage = () => {
  const { state, login } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? PATHS.dashboard
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>()

  if (state.status === 'admin') return <Navigate to={from} replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (email.trim() === '' || password === '') {
      setError(lv.auth.required)
      return
    }
    setBusy(true)
    setError(undefined)
    try {
      await login(email, password)
    } catch (e) {
      setError(loginError(e))
      setBusy(false)
    }
  }

  const notice = state.status === 'anonymous' ? state.notice : undefined
  return (
    <AuthShell title={lv.auth.title} intro={lv.auth.intro}>
      {error && <Notice tone="error">{error}</Notice>}
      {!error && notice === 'expired' && <Notice tone="info">{lv.auth.expired}</Notice>}
      {!error && notice === 'loggedOut' && <Notice tone="info">{lv.auth.loggedOut}</Notice>}
      <form onSubmit={(e) => void submit(e)} className="space-y-4" noValidate>
        <Field label={lv.auth.email}>
          {(p) => (
            <input {...p} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          )}
        </Field>
        <Field label={lv.auth.password}>
          {(p) => (
            <input
              {...p}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          )}
        </Field>
        <Button type="submit" variant="primary" className="w-full" disabled={busy}>
          {busy ? lv.auth.submitting : lv.auth.submit}
        </Button>
      </form>
    </AuthShell>
  )
}
