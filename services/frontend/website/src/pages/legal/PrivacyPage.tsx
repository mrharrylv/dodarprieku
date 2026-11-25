import { useTranslation } from 'react-i18next'

import { hasAnalytics } from '@/config/env'
import { MAP, ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { LegalShell, LegalSection } from '@/components/legal/LegalShell'
import { legalValues } from '@/components/legal/legal-values'

export const PrivacyPage = () => {
  const { t } = useTranslation('legal')
  const { locale } = useLocale()
  const v = legalValues()
  // The statistics paragraphs appear exactly when the site sends them
  // (ENV.analyticsEndpoint), so the policy cannot claim "no analytics" on a
  // site that reports to the CRM, nor describe statistics a site turned off.
  const stats = hasAnalytics()

  return (
    <LegalShell
      title={t('privacy.title')}
      description={t('privacy.meta.description')}
      path={ROUTES.privacy}
      locale={locale}
    >
      <p>{t('privacy.intro', v)}</p>

      <LegalSection title={t('privacy.controller.title')}>
        <p>{t('privacy.controller.body', v)}</p>
      </LegalSection>

      <LegalSection title={t('privacy.collected.title')}>
        <p>{t(stats ? 'privacy.collected.bodyWithStats' : 'privacy.collected.body')}</p>
        <p>{t('privacy.collected.serverLead')}</p>
        <ul>
          <li>{t('privacy.collected.server.ip')}</li>
          <li>{t('privacy.collected.server.agent')}</li>
          <li>{t('privacy.collected.server.time')}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t('privacy.purpose.title')}>
        <p>{t('privacy.purpose.body')}</p>
      </LegalSection>

      {stats && (
        <LegalSection title={t('privacy.statistics.title')}>
          <p>{t('privacy.statistics.body', v)}</p>
        </LegalSection>
      )}

      <LegalSection title={t('privacy.sharing.title')}>
        <p>{t('privacy.sharing.lead')}</p>
        <ul>
          <li>{t('privacy.sharing.hosting')}</li>
          <li>{t('privacy.sharing.email')}</li>
          {MAP !== null && <li>{t('privacy.sharing.map')}</li>}
          {stats && <li>{t('privacy.sharing.statistics', v)}</li>}
        </ul>
        <p>{t('privacy.sharing.note')}</p>
      </LegalSection>

      <LegalSection title={t('privacy.retention.title')}>
        <p>{t('privacy.retention.body')}</p>
      </LegalSection>

      <LegalSection title={t('privacy.rights.title')}>
        <p>{t('privacy.rights.lead')}</p>
        <ul>
          <li>{t('privacy.rights.access')}</li>
          <li>{t('privacy.rights.rectify')}</li>
          <li>{t('privacy.rights.erase')}</li>
          <li>{t('privacy.rights.restrict')}</li>
          <li>{t('privacy.rights.portability')}</li>
          <li>{t('privacy.rights.object')}</li>
          <li>{t('privacy.rights.withdraw')}</li>
        </ul>
        <p>{t('privacy.rights.how', v)}</p>
      </LegalSection>

      <LegalSection title={t('privacy.security.title')}>
        <p>{t('privacy.security.body')}</p>
      </LegalSection>

      <LegalSection title={t('privacy.children.title')}>
        <p>{t('privacy.children.body', v)}</p>
      </LegalSection>

      <LegalSection title={t('privacy.changes.title')}>
        <p>{t('privacy.changes.body')}</p>
      </LegalSection>
    </LegalShell>
  )
}
