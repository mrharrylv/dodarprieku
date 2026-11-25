import { useTranslation } from 'react-i18next'

import { CONTACT, SITE } from '@/config/site'
import { Icon } from '@/components/ui/Icon'

/**
 * A floating link into a WhatsApp chat with the business.
 *
 * `wa.me` opens the app on a phone and WhatsApp Web on a desktop, with the
 * message pre-filled in the visitor's language so the first thing the business
 * reads says where it came from.
 *
 * Renders nothing without a number: a bubble that opens an empty chat is worse
 * than no bubble. The fill is WhatsApp's own brand green, a fixed third-party
 * colour that is exempt from the contrast rule as a logotype; the glyph is the
 * official mark.
 */
export const WhatsAppBubble = ({ number = CONTACT.whatsapp }: { number?: string }) => {
  const { t } = useTranslation('common')

  if (number.trim().length === 0) return null

  const text = encodeURIComponent(t('whatsapp.prefill', { brand: SITE.name }))
  const href = `https://wa.me/${number}?text=${text}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('whatsapp.ariaLabel', { brand: SITE.name })}
      className="fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-(--color-whatsapp) text-white shadow-(--shadow-lifted) transition-transform hover:scale-105 focus-visible:scale-105 sm:bottom-6 sm:right-6"
    >
      <Icon name="whatsapp" className="h-7 w-7" />
    </a>
  )
}
