/** The signed-in shell: a sidebar with counts, the page in <main>, and logout. */
import { useState, type ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/auth'
import { useCounts } from '../context/counts'
import { lv } from '../i18n/lv'
import type { Counts } from '../lib/dashboard'
import { PATHS } from '../paths'
import {
  IconBuilding, IconDashboard, IconDiff, IconGift, IconInbox, IconList, IconLogout, IconMenu, IconUsers,
} from './Icon'
import { BrandMark } from './BrandMark'
import { Badge } from './ui'

interface NavItem {
  readonly to: string
  readonly label: string
  readonly icon: ReactNode
  readonly count?: keyof Counts
}

const NAV: readonly NavItem[] = [
  { to: PATHS.dashboard, label: lv.nav.dashboard, icon: <IconDashboard /> },
  { to: PATHS.applications, label: lv.nav.applications, icon: <IconInbox />, count: 'pendingApplications' },
  { to: PATHS.updates, label: lv.nav.updates, icon: <IconDiff />, count: 'pendingUpdates' },
  { to: PATHS.charities, label: lv.nav.charities, icon: <IconBuilding /> },
  { to: PATHS.subscribers, label: lv.nav.subscribers, icon: <IconUsers /> },
  { to: PATHS.pledges, label: lv.nav.pledges, icon: <IconGift /> },
  { to: PATHS.listRequests, label: lv.nav.listRequests, icon: <IconList />, count: 'openRequests' },
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm font-medium ${
    isActive
      ? 'bg-[var(--surface-accent-soft)] text-[var(--text-accent)]'
      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]'
  }`

export const Layout = () => {
  const { state, logout } = useAuth()
  const { counts } = useCounts()
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen md:flex">
      <a href="#saturs" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-[var(--surface-raised)] focus:p-3">
        {lv.app.skip}
      </a>
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-2 md:hidden">
        <span className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] font-semibold">
          <BrandMark className="size-7" />
          {lv.app.name}
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="sanu-izvelne"
          className="inline-flex size-11 items-center justify-center rounded-[var(--radius-md)]"
          aria-label={lv.app.menu}
        >
          <IconMenu />
        </button>
      </div>
      <aside
        id="sanu-izvelne"
        className={`${open ? 'block' : 'hidden'} border-r border-[var(--border-subtle)] bg-[var(--surface-raised)] md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col`}
      >
        <div className="hidden items-center gap-3 px-5 pb-2 pt-6 md:flex">
          <BrandMark className="size-10" />
          <div>
            <p className="font-[family-name:var(--font-display)] text-lg font-semibold leading-tight">{lv.app.name}</p>
            <p className="text-xs text-[var(--text-muted)]">{lv.app.area}</p>
          </div>
        </div>
        <nav aria-label={lv.app.menu} className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const n = item.count && counts ? counts[item.count] : 0
            return (
              <NavLink key={item.to} to={item.to} end={item.to === PATHS.dashboard} className={linkClass} onClick={() => setOpen(false)}>
                {item.icon}
                <span>{item.label}</span>
                {n > 0 && (
                  <Badge>
                    {n}
                    <span className="sr-only"> {lv.nav.waiting}</span>
                  </Badge>
                )}
              </NavLink>
            )
          })}
        </nav>
        <div className="space-y-1 border-t border-[var(--border-subtle)] p-3">
          {state.status === 'admin' && (
            <p className="truncate px-3 pb-1 text-xs text-[var(--text-muted)]">
              {lv.nav.loggedInAs} {state.me.email}
            </p>
          )}
          <button type="button" onClick={() => void logout()} className={linkClass({ isActive: false }) + ' w-full'}>
            <IconLogout />
            {lv.nav.logout}
          </button>
        </div>
      </aside>
      <main id="saturs" className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-[var(--container-content)]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
