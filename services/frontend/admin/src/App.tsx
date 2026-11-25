import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Skeleton } from './components/ui'
import { useAuth } from './context/auth'
import { CountsProvider } from './context/counts'
import { lv } from './i18n/lv'
import { PATHS } from './paths'
import { ApplicationDetailPage } from './pages/ApplicationDetailPage'
import { ApplicationsPage } from './pages/ApplicationsPage'
import { CharitiesPage } from './pages/CharitiesPage'
import { CharityDetailPage } from './pages/CharityDetailPage'
import { DashboardPage } from './pages/DashboardPage'
import { ListRequestsPage } from './pages/ListRequestsPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PledgesPage } from './pages/PledgesPage'
import { SetPasswordPage } from './pages/SetPasswordPage'
import { SubscribersPage } from './pages/SubscribersPage'
import { UpdateDetailPage } from './pages/UpdateDetailPage'
import { UpdatesPage } from './pages/UpdatesPage'

const RequireAdmin = () => {
  const { state } = useAuth()
  const location = useLocation()
  if (state.status === 'checking') {
    return (
      <div className="mx-auto max-w-md p-8">
        <p className="sr-only">{lv.app.loading}</p>
        <Skeleton rows={3} />
      </div>
    )
  }
  if (state.status === 'anonymous') {
    return <Navigate to={PATHS.login} replace state={{ from: location.pathname + location.search }} />
  }
  return (
    <CountsProvider>
      <Layout />
    </CountsProvider>
  )
}

export const App = () => (
  <Routes>
    <Route path={PATHS.login} element={<LoginPage />} />
    <Route path={PATHS.setPassword} element={<SetPasswordPage />} />
    <Route element={<RequireAdmin />}>
      <Route index element={<DashboardPage />} />
      <Route path={PATHS.applications} element={<ApplicationsPage />} />
      <Route path={`${PATHS.applications}/:id`} element={<ApplicationDetailPage />} />
      <Route path={PATHS.updates} element={<UpdatesPage />} />
      <Route path={`${PATHS.updates}/:id`} element={<UpdateDetailPage />} />
      <Route path={PATHS.charities} element={<CharitiesPage />} />
      <Route path={`${PATHS.charities}/:id`} element={<CharityDetailPage />} />
      <Route path={PATHS.subscribers} element={<SubscribersPage />} />
      <Route path={PATHS.pledges} element={<PledgesPage />} />
      <Route path={PATHS.listRequests} element={<ListRequestsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
)
