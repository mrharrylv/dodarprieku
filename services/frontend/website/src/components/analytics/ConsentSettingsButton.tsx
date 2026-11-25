import { useTranslation } from 'react-i18next'

import { hasGoogleAnalytics } from '@/config/env'
import { Button } from '@/components/ui/Button'
import { requestConsentReopen } from './consent-events'

/** "Mainīt izvēli": asks the Google Analytics question again. Absent when GA is off. */
export const ConsentSettingsButton = ({ className }: { className?: string }) => {
  const { t } = useTranslation('common')
  if (!hasGoogleAnalytics()) return null
  return (
    <Button variant="secondary" size="sm" onClick={requestConsentReopen} {...(className !== undefined ? { className } : {})}>
      {t('consent.change')}
    </Button>
  )
}
