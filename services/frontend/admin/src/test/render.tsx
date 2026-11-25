import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../App'
import { ApiProvider } from '../context/api'
import { AuthProvider } from '../context/auth'
import { ToastProvider } from '../context/toast'
import { createClient, endpoints } from '../lib/api'
import { ADMIN } from './fixtures'
import { mockFetch, ok, type Handler } from './fetch'

/** The whole app at `path`, logged in as admin unless routes say otherwise, over a mocked fetch. */
export const renderApp = (path: string, routes: Record<string, Handler> = {}) => {
  const fetchMock = mockFetch({
    'GET /api/auth/me': () => ok(ADMIN),
    'GET /api/admin/charities': () => ok([]),
    'GET /api/admin/list-requests': () => ok([]),
    ...routes,
  })
  const client = createClient({ fetchImpl: fetchMock.impl })
  const api = endpoints(client)
  const wrap = (node: ReactNode) => (
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <ApiProvider api={api}>
          <AuthProvider client={client}>{node}</AuthProvider>
        </ApiProvider>
      </ToastProvider>
    </MemoryRouter>
  )
  return { ...render(wrap(<App />)), calls: fetchMock.calls, client }
}
