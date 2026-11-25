import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { CONTACT } from '@/config/site'

/**
 * The contact details as a ruled table of label and value: the one place in
 * the style where two columns earn their keep, because a label next to its
 * value is read faster than a label above it. It collapses to one column
 * below 640px, where there is no room for a second.
 */
export const ContactDetails = () => {
  const { t } = useTranslation('common')

  return (
    <dl className="mt-8">
      <Detail label={t('contactDetails.email')}>
        <DetailLink href={`mailto:${CONTACT.email}`}>{CONTACT.email}</DetailLink>
      </Detail>

      <Detail label={t('contactDetails.phone')}>
        {/* tel: needs the E.164 form; the visible text is the readable one. */}
        <DetailLink href={`tel:${CONTACT.phoneE164}`}>{CONTACT.phone}</DetailLink>
      </Detail>

      <Detail label={t('contactDetails.address')}>
        <address className="not-italic leading-relaxed">
          {CONTACT.address.street}
          <br />
          {CONTACT.address.postalCode} {CONTACT.address.city}
          <br />
          {CONTACT.address.country}
        </address>
      </Detail>

      <Detail label={t('contactDetails.hours')}>
        <ul className="space-y-1">
          <li>
            {t('contactDetails.weekdays')}: {CONTACT.hours.weekdays}
          </li>
          <li>
            {t('contactDetails.saturday')}:{' '}
            {CONTACT.hours.saturday ?? t('contactDetails.closed')}
          </li>
          <li>
            {t('contactDetails.sunday')}: {CONTACT.hours.sunday ?? t('contactDetails.closed')}
          </li>
        </ul>
      </Detail>
    </dl>
  )
}

/**
 * The email and the phone number: on a phone these are the two things a finger
 * goes for, so the link is a full-width 44px row rather than the height of one
 * line of text. The inner span is what lets a long address wrap inside it.
 */
const DetailLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <a
    href={href}
    className="flex min-h-11 items-center text-(--text-accent) underline decoration-1 underline-offset-4 transition-colors hover:text-(--text-primary)"
  >
    <span className="min-w-0 break-words">{children}</span>
  </a>
)

// A div grouping dt and dd inside a dl is valid HTML and is what lets the row
// carry its own rule and padding.
const Detail = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid gap-1 border-t border-(--border-subtle) py-6 sm:grid-cols-[10rem_1fr] sm:gap-6">
    <dt className="text-(length:--text-xs) uppercase tracking-[0.22em] text-(--text-muted)">
      {label}
    </dt>
    <dd className="text-(length:--text-base) text-(--text-secondary)">{children}</dd>
  </div>
)
