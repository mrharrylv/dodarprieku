import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { CONTACT, ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { Seo } from '@/components/seo/Seo'
import { ContactForm } from '@/components/contact/ContactForm'
import { Container } from '@/components/ui/Container'
import { PageIntro } from './PageIntro'
import { LocationMap } from '@/components/contact/LocationMap'

/**
 * The form on the left at the reading measure, the addresses on the right
 * behind a vertical rule: the same two-column spread as the services page, so
 * the site keeps one grid rather than inventing a second for its last page.
 *
 * The shared `ContactForm` is mounted as it comes. It owns its validation, its
 * rate limiting and its eight failure states, and a style that reimplemented
 * any of that would be a style that quietly loses messages.
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

      <PageIntro kicker={tc('nav.contact')} title={t('hero.title')} subtitle={t('hero.subtitle')} />

      <Container className="py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-14">
          <div>
            <ContactForm />
          </div>

          <aside className="border-t-2 border-(--border-strong) pt-6 lg:border-t-0 lg:border-l lg:border-(--border-subtle) lg:pt-0 lg:pl-14">
            <h2 className="font-(family-name:--font-display) text-(length:--text-2xl) font-semibold leading-[1.1] tracking-[-0.02em] text-(--text-primary)">
              {t('details.title')}
            </h2>
            <p className="mt-3 max-w-[44ch] text-(length:--text-sm) leading-relaxed text-(--text-secondary)">
              {t('details.body')}
            </p>

            <dl className="mt-8 text-(length:--text-sm)">
              <Detail label={tc('contactDetails.email')}>
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="inline-flex min-h-11 items-center break-words text-(--text-accent) underline underline-offset-4"
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
                <address className="py-2 not-italic text-(--text-secondary)">
                  {CONTACT.address.street}
                  <br />
                  {CONTACT.address.postalCode} {CONTACT.address.city}
                  <br />
                  {CONTACT.address.country}
                </address>
              </Detail>

              <Detail label={tc('contactDetails.hours')}>
                <ul className="py-2 text-(--text-secondary)">
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
      </Container>
      <LocationMap />
    </>
  )
}

/**
 * A ruled row, label left and value right once there is room for it. The label
 * is tracked small caps so the two columns read as a table without one.
 */
const Detail = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid gap-x-6 border-t border-(--border-subtle) py-3 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)]">
    <dt className="pt-2 text-(length:--text-xs) uppercase tracking-[0.18em] text-(--text-muted)">
      {label}
    </dt>
    <dd>{children}</dd>
  </div>
)
