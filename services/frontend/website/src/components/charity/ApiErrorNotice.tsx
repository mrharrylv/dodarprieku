import { useTranslation } from 'react-i18next'

import { CONTACT } from '@/config/site'
import type { ApiFailure } from '@/lib/public-api'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'

/**
 * One failed request, in words the visitor can act on: each failure kind has
 * its own title and advice (`charity` namespace, `errors.<kind>`). `title`
 * replaces the heading where the context says more ("the map did not load").
 */
export const ApiErrorNotice = ({
  error,
  title,
  onRetry,
  className,
}: {
  error: ApiFailure
  title?: string
  onRetry?: () => void
  className?: string
}) => {
  const { t } = useTranslation('charity')
  const kind = error.kind

  return (
    <Alert tone="error" title={title ?? t(`errors.${kind}.title`)} {...(className !== undefined ? { className } : {})}>
      <p>{t(`errors.${kind}.body`, { email: CONTACT.email })}</p>
      {onRetry !== undefined && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
          {t('errors.retry')}
        </Button>
      )}
    </Alert>
  )
}
