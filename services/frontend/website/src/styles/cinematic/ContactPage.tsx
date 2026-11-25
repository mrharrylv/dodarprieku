import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { CONTACT, ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { Seo } from '@/components/seo/Seo'
import { ContactForm } from '@/components/contact/ContactForm'
import { Reveal } from '@/components/ui/Reveal'
import { Band } from './Band'
import { PageHeader } from './PageHeader'
import { LocationMap } from '@/components/contact/LocationMap'

/**
 * Contact: the shared form, on the darkest band on the site.
 *
 * The band is `--surface-sunken` rather than a raised panel, and that is a
 * legibility decision rather than a visual one. The form's inputs fill with
 * `--surface-raised`, so on a sunken band they read as lit wells with no extra
 * border needed, and the field error copy (`--color-danger-600`, a ramp colour
 * a style may not repoint) gets the highest contrast any surface here can give
 * it. On a raised panel the same error text would have measured 2.7:1.
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

      <PageHeader title={t('hero.title')} subtitle={t('hero.subtitle')} />

      <Band tone="sunken">
        <div className="grid gap-16 lg:grid-cols-[1.3fr_1fr] lg:gap-20">
          <Reveal delay={0.1}>
            <ContactForm />
          </Reveal>

          <Reveal as="aside" delay={0.26}>
            <span aria-hidden="true" className="block h-px w-16 bg-(--fill-accent)" />
            <h2 className="mt-8 text-(length:--text-2xl) text-(--text-primary)">
              {t('details.title')}
            </h2>
            <p className="mt-4 text-(--text-secondary)">{t('details.body')}</p>

            <dl className="mt-10 space-y-8 text-(length:--text-sm)">
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
          </Reveal>
        </div>
      </Band>
      <LocationMap />
    </>
  )
}

const Detail = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <dt className="text-(length:--text-xs) font-semibold uppercase tracking-[0.28em] text-(--text-accent)">
      {label}
    </dt>
    <dd className="mt-2">{children}</dd>
  </div>
)
