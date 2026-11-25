import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { CONTACT } from '@/config/site'
import { Icon } from '@/components/ui/Icon'
import { Tile, TileEyebrow } from './Tile'

/**
 * The tile beside the form: the ways to reach the business that do not depend
 * on the form working.
 *
 * Accent, because when the form is unavailable this is the fallback the
 * visitor has to find, and it should be the loudest thing on the page after
 * the heading.
 */
export const ContactDetails = () => {
  const { t } = useTranslation('contact')
  const { t: tc } = useTranslation('common')

  return (
    <Tile tone="accent" className="sm:col-span-6 lg:col-span-5">
      <TileEyebrow>{tc('nav.contact')}</TileEyebrow>
      <h2 className="mt-3 text-(length:--text-xl) font-semibold tracking-tight text-(--text-primary)">
        {t('details.title')}
      </h2>
      <p className="mt-2 text-(length:--text-sm) text-(--text-secondary)">
        {t('details.body')}
      </p>

      <dl className="mt-6 space-y-5 text-(length:--text-sm)">
        <Detail label={tc('contactDetails.phone')}>
          {/* tel: needs the E.164 form; the visible text is the readable one. */}
          <a
            href={`tel:${CONTACT.phoneE164}`}
            className="inline-flex min-h-11 items-center gap-2.5 text-(length:--text-lg) font-semibold text-(--text-primary) transition-colors hover:text-(--text-accent)"
          >
            <Icon name="phone" className="h-4 w-4 shrink-0 text-(--text-accent)" />
            {CONTACT.phone}
          </a>
        </Detail>

        <Detail label={tc('contactDetails.email')}>
          <a
            href={`mailto:${CONTACT.email}`}
            className="inline-flex min-h-11 items-center gap-2.5 break-words text-(--text-secondary) transition-colors hover:text-(--text-accent)"
          >
            <Icon name="mail" className="h-4 w-4 shrink-0 text-(--text-accent)" />
            {CONTACT.email}
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
    </Tile>
  )
}

const Detail = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <dt className="text-(length:--text-xs) font-semibold uppercase tracking-[0.16em] text-(--text-muted)">
      {label}
    </dt>
    <dd className="mt-1">{children}</dd>
  </div>
)
