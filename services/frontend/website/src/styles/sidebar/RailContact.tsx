import { useTranslation } from 'react-i18next'

import { CONTACT } from '@/config/site'
import { Icon } from '@/components/ui/Icon'

/**
 * The contact block that sits low in the rail, above the controls.
 *
 * In an app shell the phone number belongs in the furniture, not at the bottom
 * of a page someone has to scroll to: it is on screen on every route, at every
 * scroll position. A plumber's site lives or dies on that one tap.
 *
 * The label is a `<p>`, not a heading. The rail renders BEFORE the page's
 * `<h1>` in the document, and a heading there would put the outline out of
 * order for anyone navigating by heading.
 */
export const RailContact = () => {
  const { t } = useTranslation('common')

  return (
    <div className="border-t border-(--border-subtle) px-4 py-3">
      <p className="text-(length:--text-xs) font-semibold uppercase tracking-[0.16em] text-(--text-muted)">
        {t('footer.contactHeading')}
      </p>

      <ul className="mt-1 text-(length:--text-sm)">
        <li>
          {/* tel: needs the E.164 form; the visible text is the readable one. */}
          <a
            href={`tel:${CONTACT.phoneE164}`}
            className="flex min-h-11 items-center gap-2.5 rounded-(--radius-md) text-(--text-primary) transition-colors hover:text-(--text-accent)"
          >
            <Icon name="phone" className="h-4 w-4 shrink-0 text-(--text-muted)" />
            <span className="truncate">{CONTACT.phone}</span>
          </a>
        </li>
        <li>
          <a
            href={`mailto:${CONTACT.email}`}
            className="flex min-h-11 items-center gap-2.5 rounded-(--radius-md) text-(--text-primary) transition-colors hover:text-(--text-accent)"
          >
            <Icon name="mail" className="h-4 w-4 shrink-0 text-(--text-muted)" />
            <span className="truncate">{CONTACT.email}</span>
          </a>
        </li>
        <li className="flex gap-2.5 py-2 text-(length:--text-xs) text-(--text-secondary)">
          <Icon name="pin" className="h-4 w-4 shrink-0 text-(--text-muted)" />
          <address className="not-italic">
            {CONTACT.address.street}
            <br />
            {CONTACT.address.postalCode} {CONTACT.address.city}
          </address>
        </li>
      </ul>
    </div>
  )
}
