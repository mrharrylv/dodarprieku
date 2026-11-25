import { useTranslation } from 'react-i18next'

import { REGISTER_CTA } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import type { ButtonSize } from '@/components/ui/button-styles'

/**
 * "+ Kļūt par saņēmēju": the header's call to action, to the registration
 * wizard. Shared so that every style shows the same one; the contract test
 * looks for it.
 */
export const RegisterButton = ({ size = 'sm', className }: { size?: ButtonSize; className?: string }) => {
  const { t } = useTranslation('common')
  const { locale } = useLocale()

  return (
    <ButtonLink to={localePath(REGISTER_CTA.to, locale)} size={size} {...(className !== undefined ? { className } : {})}>
      <Icon name="plus" />
      <span>{t(REGISTER_CTA.labelKey)}</span>
    </ButtonLink>
  )
}
