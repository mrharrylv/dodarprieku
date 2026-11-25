import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { CONTACT, ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { cn } from '@/lib/cn'
import { ContactForm } from '@/components/contact/ContactForm'
import { Seo } from '@/components/seo/Seo'
import { Container } from '@/components/ui/Container'
import { Hero } from './Hero'
import { LineCell, LineGrid } from './LineGrid'
import { FOCUS, LABEL, ordinal } from './marks'
import { LocationMap } from '@/components/contact/LocationMap'

// Block-level flex so a long address wraps inside the cell rather than
// widening it. See SpecStrip for the same reasoning.
const LINK = cn(
  'flex min-h-11 max-w-full items-center break-words font-bold text-(--text-primary) hover:underline hover:decoration-2 hover:underline-offset-4',
  FOCUS,
)

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

      <Hero
        index={ordinal(1)}
        kicker={tc('nav.contact')}
        title={t('hero.title')}
        subtitle={t('hero.subtitle')}
      />

      <section className="border-b-4 border-(--border-strong)">
        <Container className="py-12 sm:py-16">
          <LineGrid as="div" className="lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            {/* The form cell carries only its number. `ContactForm` renders its
                own legend, and a heading above it would say the same thing
                twice to a screen reader. */}
            <LineCell as="div" index={ordinal(2)}>
              <ContactForm />
            </LineCell>

            <LineCell as="div" index={ordinal(3)} tone="sunken">
              <h2 className="break-words text-(length:--text-xl) font-bold uppercase tracking-[0.02em] text-(--text-primary)">
                {t('details.title')}
              </h2>
              <p className="mt-3 text-(length:--text-sm) text-(--text-secondary)">
                {t('details.body')}
              </p>

              <dl className="mt-8 text-(length:--text-sm)">
                <Detail label={tc('contactDetails.email')}>
                  <a href={`mailto:${CONTACT.email}`} className={LINK}>
                    {CONTACT.email}
                  </a>
                </Detail>

                <Detail label={tc('contactDetails.phone')}>
                  {/* tel: needs the E.164 form; the visible text is readable. */}
                  <a href={`tel:${CONTACT.phoneE164}`} className={LINK}>
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
                  <ul className="text-(--text-secondary)">
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
            </LineCell>
          </LineGrid>
        </Container>
      </section>
      <LocationMap />
    </>
  )
}

const Detail = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="border-t-2 border-(--border-subtle) py-4 first:border-t-0 first:pt-0">
    <dt className={LABEL}>{label}</dt>
    <dd className="mt-1">{children}</dd>
  </div>
)
