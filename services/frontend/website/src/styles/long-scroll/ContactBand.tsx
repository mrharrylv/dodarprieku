import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { CONTACT } from '@/config/site'
import { ContactForm } from '@/components/contact/ContactForm'
import { Reveal } from '@/components/ui/Reveal'
import { Band, BandHeading } from './Band'
import { SECTIONS } from './sections'

/**
 * The end of the page, and the point of it.
 *
 * The form is a band here rather than a separate destination: on a single
 * offer, asking someone who has just read the whole pitch to click through to
 * a contact page loses a proportion of them for nothing. `raised` is the
 * brightest surface in light mode and the lightest in dark, so the last band
 * lifts off the page in both themes without a single colour being named here.
 */
export const ContactBand = ({ index }: { index: number }) => {
  const { t } = useTranslation('contact')
  const { t: tc } = useTranslation('common')

  return (
    <Band id={SECTIONS.contact} tone="raised">
      <BandHeading index={index} title={t('hero.title')} lead={t('hero.subtitle')} />

      <div className="grid gap-14 lg:grid-cols-[1.3fr_1fr] lg:gap-20">
        <Reveal>
          <ContactForm />
        </Reveal>

        <Reveal as="aside" delay={0.08}>
          <h3 className="text-(length:--text-xl) font-semibold tracking-tight text-(--text-primary)">
            {t('details.title')}
          </h3>
          <p className="mt-3 text-(length:--text-sm) text-(--text-secondary)">
            {t('details.body')}
          </p>

          <dl className="mt-8 border-t border-(--border-subtle) text-(length:--text-sm)">
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
  )
}

/** A labelled row of the details list, ruled like everything else on the page. */
const Detail = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid gap-1 border-b border-(--border-subtle) py-5 sm:grid-cols-[9rem_1fr] sm:gap-6">
    <dt className="text-(length:--text-xs) font-semibold uppercase tracking-[0.14em] text-(--text-muted)">
      {label}
    </dt>
    <dd>{children}</dd>
  </div>
)
