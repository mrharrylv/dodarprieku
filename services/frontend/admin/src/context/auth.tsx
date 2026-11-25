/**
 * Who is logged in. Probes /auth/me once, accepts only role admin, and turns
 * any later 401 into "session expired" so the router sends the admin back to
 * the login page with that message.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Me } from '@shared/contracts'
import { client as defaultClient, ApiError, type Client } from '../lib/api'
import { useApi } from './api'

export type AuthNotice = 'expired' | 'loggedOut' | undefined

export type AuthState =
  | { readonly status: 'checking' }
  | { readonly status: 'anonymous'; readonly notice: AuthNotice }
  | { readonly status: 'admin'; readonly me: Me }

interface AuthApi {
  readonly state: AuthState
  readonly login: (email: string, password: string) => Promise<void>
  readonly acceptSession: (me: Me) => void
  readonly logout: () => Promise<void>
}

const AuthContext = createContext<AuthApi | undefined>(undefined)

/** Thrown by login when the credentials are right but the account is not an admin. */
export class NotAdminError extends Error {
  constructor() {
    super('not_admin')
    this.name = 'NotAdminError'
  }
}

interface ProviderProps {
  readonly children: ReactNode
  readonly client?: Client
}

export const AuthProvider = ({ children, client = defaultClient }: ProviderProps) => {
  const api = useApi()
  const [state, setState] = useState<AuthState>({ status: 'checking' })

  useEffect(() => {
    let live = true
    api.me().then(
      (me) => live && setState(me.role === 'admin' ? { status: 'admin', me } : { status: 'anonymous', notice: undefined }),
      () => live && setState({ status: 'anonymous', notice: undefined }),
    )
    client.setUnauthorizedHandler(() => setState({ status: 'anonymous', notice: 'expired' }))
    return () => {
      live = false
      client.setUnauthorizedHandler(undefined)
    }
  }, [api, client])

  const login = useCallback(
    async (email: string, password: string) => {
      const me = await api.login({ email: email.trim(), password })
      if (me.role !== 'admin') {
        await api.logout().catch((e: unknown) => console.warn('[auth] logout after non-admin login failed', e))
        throw new NotAdminError()
      }
      setState({ status: 'admin', me })
    },
    [api],
  )

  const acceptSession = useCallback((me: Me) => setState({ status: 'admin', me }), [])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } catch (e) {
      // The cookie may already be gone; the local state is cleared either way.
      if (!(e instanceof ApiError)) throw e
      console.warn('[auth] logout request failed', e.code)
    }
    setState({ status: 'anonymous', notice: 'loggedOut' })
  }, [api])

  const value = useMemo(() => ({ state, login, acceptSession, logout }), [state, login, acceptSession, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthApi => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
