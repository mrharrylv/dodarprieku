import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { CONTACT, ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { Seo } from '@/components/seo/Seo'
import { ContactForm } from '@/components/contact/ContactForm'
import { Band } from './Band'
import { PageIntro } from './PageIntro'
import { LocationMap } from '@/components/contact/LocationMap'

/**
 * The form is the shared one. The details beside it are a plain list on a
 * hairline, not a card: a box around the phone number on a page whose whole job
 * is the phone number adds nothing.
 */
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

      <PageIntro
        eyebrow={tc('nav.contact')}
        title={t('hero.title')}
        subtitle={t('hero.subtitle')}
      />

      <Band>
        <div className="grid gap-16 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <ContactForm />
          </div>

          <aside className="border-t border-(--border-subtle) pt-10 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
            <h2 className="text-(length:--text-xl) font-semibold tracking-tight">
              {t('details.title')}
            </h2>
            <p className="mt-3 text-(length:--text-sm) text-(--text-secondary)">
              {t('details.body')}
            </p>

            <dl className="mt-10 text-(length:--text-sm)">
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
          </aside>
        </div>
      </Band>
      <LocationMap />
    </>
  )
}

const Detail = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="border-t border-(--border-subtle) py-5 first:border-t-0 first:pt-0">
    <dt className="text-(length:--text-xs) font-semibold uppercase tracking-[0.18em] text-(--text-muted)">
      {label}
    </dt>
    <dd className="mt-2">{children}</dd>
  </div>
)
