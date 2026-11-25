import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { CONTACT, ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { Seo } from '@/components/seo/Seo'
import { ContactForm } from '@/components/contact/ContactForm'
import { PageHead } from './PageHead'
import { SplitSection } from './SplitSection'
import { LocationMap } from '@/components/contact/LocationMap'

export const ContactPage = () => {
  const { t } = useTranslation('contact')
  const { t: tc } = useTranslation('common')
  const { locale } = useLocale()

  return (
    <>
      <Seo
        title={t('meta.title')}
        description={t('meta.description')}
        path={ROUTES.contact}
        locale={locale}
      />

      <PageHead title={t('hero.title')} subtitle={t('hero.subtitle')} />

      {/*
        The form is the shared one, mounted, not rebuilt: it carries the
        validation, the rate limit, the error states and the fallback copy for
        a site built without Firebase. A style that reimplements it ships a
        form that silently fails.

        It goes in the WIDE half. `form.legend` is rendered here as the visible
        heading because the form's own <legend> is screen-reader only, so the
        heading and the accessible name say the same thing exactly once each.
      */}
      <SplitSection heading={t('form.legend')}>
        <ContactForm />
      </SplitSection>

      <SplitSection
        flip
        tone="sunken"
        heading={t('details.title')}
        lead={t('details.body')}
      >
        <dl className="border-t border-(--border-subtle) text-(length:--text-sm)">
          <Detail label={tc('contactDetails.email')}>
            <a
              href={`mailto:${CONTACT.email}`}
              className="inline-flex min-h-11 items-center text-(--text-accent) underline underline-offset-4"
            >
              {CONTACT.email}
            </a>
          </Detail>

          <Detail label={tc('contactDetails.phone')}>
            {/* tel: needs the E.164 form; the visible text is the readable one. */}
            <a
              href={`tel:${CONTACT.phoneE164}`}
              className="inline-flex min-h-11 items-center text-(--text-accent) underline underline-offset-4"
            >
              {CONTACT.phone}
            </a>
          </Detail>

          <Detail label={tc('contactDetails.address')}>
            <address className="not-italic text-(--text-secondary)">
              {CONTACT.address.street}
              <br />
              {CONTACT.address.postalCode} {CONTACT.address.city}
              <br />
              {CONTACT.address.country}
            </address>
          </Detail>

          <Detail label={tc('contactDetails.hours')}>
            <ul className="space-y-1 text-(--text-secondary)">
              <li>
                {tc('contactDetails.weekdays')}: {CONTACT.hours.weekdays}
              </li>
              <li>
                {tc('contactDetails.saturday')}:{' '}
                {CONTACT.hours.saturday ?? tc('contactDetails.closed')}
              </li>
              <li>
                {tc('contactDetails.sunday')}:{' '}
                {CONTACT.hours.sunday ?? tc('contactDetails.closed')}
              </li>
            </ul>
          </Detail>
        </dl>
      </SplitSection>
      <LocationMap />
    </>
  )
}

/**
 * One row of the details list: the label in a narrow left column, the value
 * beside it, a rule under both. The same row rhythm as every other list in
 * this style, so the contact page does not look like a different site.
 */
const Detail = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid gap-x-6 gap-y-1 border-b border-(--border-subtle) py-5 sm:grid-cols-[8rem_minmax(0,1fr)]">
    <dt className="text-(length:--text-xs) font-semibold uppercase tracking-[0.18em] text-(--text-muted)">
      {label}
    </dt>
    <dd>{children}</dd>
  </div>
)
