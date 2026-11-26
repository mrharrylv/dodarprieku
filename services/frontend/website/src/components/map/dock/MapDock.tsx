import { lazy, Suspense, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import type { Dock } from '@/lib/map-route'
import { DockPanel } from './DockPanel'

/** Each dock's content is its own chunk: the wizard and the account editor are big, and only some visitors open them. */
const RegisterPanel = lazy(() => import('@/components/register/RegisterPanel').then((m) => ({ default: m.RegisterPanel })))
const AccountDock = lazy(() => import('@/components/account/AccountDock').then((m) => ({ default: m.AccountDock })))

const titleKey = (dock: Dock): string => {
  if (dock.kind === 'register') return 'dock.register'
  if (dock.view === 'forgot') return 'dock.forgot'
  if (dock.view === 'set-password') return 'dock.setPassword'
  return 'dock.account'
}

/** The open dock: registration, or the account with its views. */
export const MapDock = ({ dock, panelRef, onClose }: { dock: Dock; panelRef: RefObject<HTMLElement | null>; onClose: () => void }) => {
  const { t } = useTranslation('map')
  return (
    <DockPanel key={dock.kind} title={t(titleKey(dock))} onClose={onClose} panelRef={panelRef}>
      <Suspense fallback={<p role="status" className="py-16 text-center text-(--text-muted)">{t('panel.loading')}</p>}>
        {dock.kind === 'register' ? <RegisterPanel /> : <AccountDock view={dock.view} />}
      </Suspense>
    </DockPanel>
  )
}
