import { useTranslation } from 'react-i18next'

import { CONTACT, COMPANY, ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { LegalShell } from '@/components/legal/LegalShell'
import { legalValues } from '@/components/legal/legal-values'
import { publishable } from '@/lib/placeholder'

/**
 * Placeholder values are never printed.
 *
 * A registration number reading `40203XXXXXX` on a published legal page is a
 * false statement about a real company. Anything `lib/placeholder.ts` still
 * recognises as a template value (a run of X, "example", a phone number of
 * zeros), or left empty, shows "not published" instead: visibly incomplete
 * rather than plausibly wrong. The structured data asks the same function.
 */
const real = publishable

export const CompanyPage = () => {
  const { t } = useTranslation('legal')
  const { locale } = useLocale()
  const v = legalValues()

  const rows: ReadonlyArray<[string, string | null]> = [
    [t('company.labels.legalName'), real(COMPANY.legalName)],
    [t('company.labels.registrationNumber'), real(COMPANY.registrationNumber)],
    [t('company.labels.vatNumber'), real(COMPANY.vatNumber)],
    [t('company.labels.address'), real(COMPANY.registeredAddress)],
    [t('company.labels.email'), real(CONTACT.email)],
    [t('company.labels.phone'), real(CONTACT.phone)],
    [t('company.labels.iban'), real(COMPANY.iban)],
    [t('company.labels.bank'), real(COMPANY.bank)],
  ]

  return (
    <LegalShell
      title={t('company.title')}
      description={t('company.meta.description')}
      path={ROUTES.company}
      locale={locale}
    >
      <p>{t('company.intro', v)}</p>

      <dl className="mt-8 divide-y divide-(--border-subtle) border-y border-(--border-subtle)">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 py-3 sm:grid-cols-[14rem_1fr] sm:gap-4">
            <dt className="font-semibold text-(--text-primary)">{label}</dt>
            <dd className={value === null ? 'text-(--text-muted)' : 'text-(--text-secondary)'}>
              {value ?? t('company.notProvided')}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-8 text-(length:--text-sm) text-(--text-muted)">
        {t('company.note')}
      </p>
    </LegalShell>
  )
}
