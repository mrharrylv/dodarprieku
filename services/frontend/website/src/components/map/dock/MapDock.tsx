import { lazy, Suspense, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import type { Dock } from '@/lib/map-route'
import { DockPanel } from './DockPanel'
import { DockSkeleton } from './DockSkeleton'
import { loadAccountDock, loadRegisterPanel } from './dock-chunks'

/** Each dock's content is its own chunk: the wizard and the account editor are big, and only some visitors open them. */
const RegisterPanel = lazy(() => loadRegisterPanel().then((m) => ({ default: m.RegisterPanel })))
const AccountDock = lazy(() => loadAccountDock().then((m) => ({ default: m.AccountDock })))

const titleKey = (dock: Dock): string => {
  if (dock.kind === 'register') return 'dock.register'
  if (dock.view === 'forgot') return 'dock.forgot'
  if (dock.view === 'set-password') return 'dock.setPassword'
  return 'dock.account'
}

/**
 * The open dock: registration, or the account with its views. `closing` plays
 * its slide back out; the page unmounts it once that has finished.
 */
export const MapDock = ({
  dock,
  panelRef,
  onClose,
  closing = false,
}: {
  dock: Dock
  panelRef: RefObject<HTMLElement | null>
  onClose: () => void
  closing?: boolean
}) => {
  const { t } = useTranslation('map')
  return (
    <DockPanel key={dock.kind} title={t(titleKey(dock))} onClose={onClose} panelRef={panelRef} closing={closing}>
      <Suspense fallback={<DockSkeleton label={t('panel.loading')} />}>
        {dock.kind === 'register' ? <RegisterPanel /> : <AccountDock view={dock.view} />}
      </Suspense>
    </DockPanel>
  )
}
