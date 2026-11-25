import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { LegalShell, LegalSection } from '@/components/legal/LegalShell'
import { legalValues } from '@/components/legal/legal-values'

const SECTIONS = [
  'provider',
  'use',
  'content',
  'ip',
  'liability',
  'links',
  'law',
  'changes',
] as const

export const TermsPage = () => {
  const { t } = useTranslation('legal')
  const { locale } = useLocale()
  const v = legalValues()

  return (
    <LegalShell
      title={t('terms.title')}
      description={t('terms.meta.description')}
      path={ROUTES.terms}
      locale={locale}
    >
      <p>{t('terms.intro', v)}</p>

      {SECTIONS.map((section) => (
        <LegalSection key={section} title={t(`terms.${section}.title`)}>
          <p>{t(`terms.${section}.body`, v)}</p>
        </LegalSection>
      ))}
    </LegalShell>
  )
}
