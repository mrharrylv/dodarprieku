import { useTranslation } from 'react-i18next'

import { COMPANY, CONTACT } from '@/config/site'
import { cn } from '@/lib/cn'

/**
 * Who runs the site, for every footer: the legal name, registration and VAT
 * numbers, the address and the contact email. All of it from
 * `COMPANY` and `CONTACT` in `site.ts`; the phone is deliberately absent.
 */
export const CompanyDetails = ({ className }: { className?: string }) => {
  const { t } = useTranslation('common')

  return (
    <div className={cn(className)}>
      <h2 className="text-(length:--text-sm) font-semibold uppercase tracking-wide text-(--text-muted)">
        {t('footer.companyHeading')}
      </h2>
      <address className="mt-4 space-y-1 text-(length:--text-sm) not-italic text-(--text-secondary)">
        <p className="font-medium text-(--text-primary)">{COMPANY.legalName}</p>
        <p>{t('footer.registrationNumber', { value: COMPANY.registrationNumber })}</p>
        <p>{t('footer.vatNumber', { value: COMPANY.vatNumber })}</p>
        <p>
          {CONTACT.address.street}, {CONTACT.address.city}, {CONTACT.address.postalCode}
        </p>
        <p>
          <a href={`mailto:${CONTACT.email}`} className="inline-flex min-h-11 items-center hover:text-(--text-accent)">
            {CONTACT.email}
          </a>
        </p>
      </address>
    </div>
  )
}
