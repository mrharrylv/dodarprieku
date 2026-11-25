import { Suspense, lazy, type ReactNode } from 'react'
import type { RouteObject } from 'react-router-dom'

import { CHARITY_SLUG_PARAM, ROUTES } from '@/config/site'
import { isPrefixed } from '@/lib/locale-path'
import { LocaleLayout } from '@/components/layout/LocaleLayout'
import { RootRedirect } from '@/components/layout/RootRedirect'
import { NotFoundPage } from '@/pages/NotFoundPage'
import type { SiteStyle } from '@/styles/contract'

/**
 * The application's own pages, each its own chunk: the map page carries
 * MapLibre, which nobody reading a policy should download.
 */
const MapPage = lazy(() => import('@/pages/map/MapPage').then((m) => ({ default: m.MapPage })))
const CharityPage = lazy(() =>
  import('@/pages/charity/CharityPage').then((m) => ({ default: m.CharityPage })),
)
const RegisterPage = lazy(() =>
  import('@/pages/register/RegisterPage').then((m) => ({ default: m.RegisterPage })),
)
const AccountPage = lazy(() =>
  import('@/pages/account/AccountPage').then((m) => ({ default: m.AccountPage })),
)
const SetPasswordPage = lazy(() =>
  import('@/pages/account/SetPasswordPage').then((m) => ({ default: m.SetPasswordPage })),
)
const ForgotPasswordPage = lazy(() =>
  import('@/pages/account/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
)

/**
 * The legal pages are long, rarely read, and identical for everyone. Splitting
 * them out keeps a few kilobytes of policy text out of the bundle every visitor
 * downloads to look at the home page.
 */
const PrivacyPage = lazy(() =>
  import('@/pages/legal/PrivacyPage').then((m) => ({ default: m.PrivacyPage })),
)
const CookiesPage = lazy(() =>
  import('@/pages/legal/CookiesPage').then((m) => ({ default: m.CookiesPage })),
)
const TermsPage = lazy(() =>
  import('@/pages/legal/TermsPage').then((m) => ({ default: m.TermsPage })),
)
const CompanyPage = lazy(() =>
  import('@/pages/legal/CompanyPage').then((m) => ({ default: m.CompanyPage })),
)

/** Route paths are relative to the layout, so they carry no leading slash. */
const relative = (route: string): string => route.replace(/^\//, '')

const withSuspense = (element: ReactNode) => (
  // A blank fallback, not a spinner: these chunks are a few kilobytes and
  // resolve in a frame or two on any real connection. A spinner that flashes
  // for 40ms is worse than nothing appearing at all.
  <Suspense fallback={<div className="min-h-[60vh]" />}>{element}</Suspense>
)

/**
 * The route table for one style.
 *
 * The style supplies the shell and the About page; the map, the charity page,
 * registration, the account pages, the legal pages, the 404 and the
 * redirects are the same for every style. `/organizacija` (the prerendered
 * shell) and `/organizacija/:slug` both render the charity page. `App` calls this
 * with the compiled-in style; the contract test calls it with every style on
 * disk.
 *
 * A single-locale site gets no `/:lang` segment at all (see `lib/locale-path`).
 * Both shapes are built from the same `pageRoutes`, so a new page is added in
 * one place and works either way.
 */
export const buildRoutes = (style: SiteStyle): RouteObject[] => {
  const { About } = style.pages
  const { Shell } = style

  const pageRoutes: RouteObject[] = [
    { index: true, element: withSuspense(<MapPage />) },
    { path: relative(ROUTES.charity), element: withSuspense(<CharityPage />) },
    {
      path: `${relative(ROUTES.charity)}/:${CHARITY_SLUG_PARAM}`,
      element: withSuspense(<CharityPage />),
    },
    { path: relative(ROUTES.register), element: withSuspense(<RegisterPage />) },
    { path: relative(ROUTES.account), element: withSuspense(<AccountPage />) },
    { path: relative(ROUTES.setPassword), element: withSuspense(<SetPasswordPage />) },
    { path: relative(ROUTES.forgotPassword), element: withSuspense(<ForgotPasswordPage />) },
    { path: relative(ROUTES.about), element: <About /> },
    { path: relative(ROUTES.privacy), element: withSuspense(<PrivacyPage />) },
    { path: relative(ROUTES.cookies), element: withSuspense(<CookiesPage />) },
    { path: relative(ROUTES.terms), element: withSuspense(<TermsPage />) },
    { path: relative(ROUTES.company), element: withSuspense(<CompanyPage />) },
    { path: '*', element: <NotFoundPage /> },
  ]

  return isPrefixed()
    ? [
        { path: '/', element: <RootRedirect /> },
        { path: '/:lang', element: <LocaleLayout Shell={Shell} />, children: pageRoutes },
      ]
    : [{ path: '/', element: <Shell />, children: pageRoutes }]
}
