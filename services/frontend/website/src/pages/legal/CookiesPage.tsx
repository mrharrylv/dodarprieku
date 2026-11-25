import { useTranslation } from 'react-i18next'

import { hasAnalytics } from '@/config/env'
import { MAP, ROUTES, STORAGE_KEYS } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { LegalShell, LegalSection } from '@/components/legal/LegalShell'
import { legalValues } from '@/components/legal/legal-values'

/**
 * The table below must list EVERY key the site writes to local storage.
 *
 * It is built from `STORAGE_KEYS` rather than typed out, so a new key cannot be
 * added to the code and forgotten here: the row appears automatically and the
 * missing translation is then obvious. Adding a key is still a legal-copy
 * change in all three languages, not just a line of TypeScript.
 */
const ROWS = [
  { key: STORAGE_KEYS.theme, purpose: 'themePurpose', duration: 'untilCleared' },
  { key: STORAGE_KEYS.locale, purpose: 'localePurpose', duration: 'untilCleared' },
  { key: STORAGE_KEYS.consent, purpose: 'consentPurpose', duration: 'oneYear' },
  {
    key: STORAGE_KEYS.contactRateLimit,
    purpose: 'rateLimitPurpose',
    duration: 'tenMinutes',
  },
] as const

export const CookiesPage = () => {
  const { t } = useTranslation('legal')
  const { locale } = useLocale()
  const v = legalValues()

  return (
    <LegalShell
      title={t('cookies.title')}
      description={t('cookies.meta.description')}
      path={ROUTES.cookies}
      locale={locale}
    >
      <p>{t('cookies.intro')}</p>

      <LegalSection title={t('cookies.tableTitle')}>
        {/* Wide content scrolls inside its own container: the page body must
            never scroll sideways on a phone. */}
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th scope="col">{t('cookies.table.key')}</th>
                <th scope="col">{t('cookies.table.purpose')}</th>
                <th scope="col">{t('cookies.table.duration')}</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.key}>
                  <td>
                    <code>{row.key}</code>
                  </td>
                  <td>{t(`cookies.table.${row.purpose}`)}</td>
                  <td>{t(`cookies.table.${row.duration}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection title={t('cookies.control.title')}>
        <p>{t('cookies.control.body', v)}</p>
      </LegalSection>

      {hasAnalytics() && (
        <LegalSection title={t('cookies.statistics.title')}>
          <p>{t('cookies.statistics.body', v)}</p>
        </LegalSection>
      )}

      <LegalSection title={t('cookies.thirdParty.title')}>
        {/* The map is a third-party request, and only while it is on. */}
        {MAP === null ? (
          <p>{t('cookies.thirdParty.body')}</p>
        ) : (
          <>
            <p>{t('cookies.thirdParty.bodyWithMap')}</p>
            <p>{t('cookies.thirdParty.map')}</p>
          </>
        )}
      </LegalSection>
    </LegalShell>
  )
}
