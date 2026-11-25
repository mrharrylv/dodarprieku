import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { CONTACT, ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { Seo } from '@/components/seo/Seo'
import { ContactForm } from '@/components/contact/ContactForm'
import { Band } from './Band'
import { PageHead } from './PageHead'
import { Panel } from './Panel'
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

      <PageHead
        label={tc('nav.contact')}
        title={t('hero.title')}
        subtitle={t('hero.subtitle')}
      />

      <Band>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
          <Panel className="sm:p-7">
            <ContactForm />
          </Panel>

          {/* The details stay on screen while a long form is filled in, so the
              phone number is still there when someone gives up on typing. */}
          <aside className="grid gap-3 lg:sticky lg:top-8 lg:self-start">
            <Panel>
              <h2 className="text-(length:--text-lg) text-(--text-primary)">
                {t('details.title')}
              </h2>
              <p className="mt-1 text-(length:--text-sm) text-(--text-secondary)">
                {t('details.body')}
              </p>

              <dl className="mt-4 text-(length:--text-sm)">
                <Row label={tc('contactDetails.phone')}>
                  {/* tel: needs E.164; the visible text is the readable form. */}
                  <a
                    href={`tel:${CONTACT.phoneE164}`}
                    className="inline-flex min-h-11 items-center text-(--text-accent) underline underline-offset-2"
                  >
                    {CONTACT.phone}
                  </a>
                </Row>

                <Row label={tc('contactDetails.email')}>
                  <a
                    href={`mailto:${CONTACT.email}`}
                    className="inline-flex min-h-11 items-center break-words text-(--text-accent) underline underline-offset-2"
                  >
                    {CONTACT.email}
                  </a>
                </Row>

                <Row label={tc('contactDetails.address')}>
                  <address className="not-italic text-(--text-secondary)">
                    {CONTACT.address.street}
                    <br />
                    {CONTACT.address.postalCode} {CONTACT.address.city}
                    <br />
                    {CONTACT.address.country}
                  </address>
                </Row>
              </dl>
            </Panel>

            <Panel>
              <h2 className="text-(length:--text-lg) text-(--text-primary)">
                {tc('contactDetails.hours')}
              </h2>

              <dl className="mt-3 text-(length:--text-sm)">
                <Row label={tc('contactDetails.weekdays')}>
                  <span className="text-(--text-secondary)">{CONTACT.hours.weekdays}</span>
                </Row>
                <Row label={tc('contactDetails.saturday')}>
                  <span className="text-(--text-secondary)">
                    {CONTACT.hours.saturday ?? tc('contactDetails.closed')}
                  </span>
                </Row>
                <Row label={tc('contactDetails.sunday')}>
                  <span className="text-(--text-secondary)">
                    {CONTACT.hours.sunday ?? tc('contactDetails.closed')}
                  </span>
                </Row>
              </dl>
            </Panel>
          </aside>
        </div>
      </Band>
      <LocationMap />
    </>
  )
}

/**
 * One line of a specification list: label left, value right, hairline between.
 * It wraps to two lines under 400px rather than squeezing an email address
 * into a 12 character column.
 */
const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-(--border-subtle) py-2 first:border-t-0 first:pt-0">
    <dt className="font-medium text-(--text-muted)">{label}</dt>
    <dd className="min-w-0 text-right">{children}</dd>
  </div>
)
