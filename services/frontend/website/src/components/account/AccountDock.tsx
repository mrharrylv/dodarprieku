import type { AccountView } from '@/lib/map-route'
import { AccountPanel } from './AccountPanel'
import { ForgotPasswordForm } from './ForgotPasswordForm'
import { SetPasswordForm } from './SetPasswordForm'

/** What the account panel holds for each of its addresses (`lib/map-route`). */
export const AccountDock = ({ view }: { view: AccountView }) => {
  if (view === 'forgot') return <ForgotPasswordForm />
  if (view === 'set-password') return <SetPasswordForm />
  return <AccountPanel />
}
