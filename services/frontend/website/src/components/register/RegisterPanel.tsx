import { useTranslation } from 'react-i18next'

import { RegisterWizard } from './RegisterWizard'

/**
 * "Kļūt par saņēmēju" in its half-screen panel over the map (`/registreties`).
 * The panel opens only in the browser, after hydration, so the wizard picks
 * up the visitor's session draft on its first mount.
 */
export const RegisterPanel = () => {
  const { t } = useTranslation('register')
  return (
    <div className="space-y-6">
      <p className="text-(--text-secondary)">{t('intro')}</p>
      <RegisterWizard restore />
    </div>
  )
}
