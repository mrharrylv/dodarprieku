import { useTranslation } from 'react-i18next'

import { CONTACT, ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Panel } from './Panel'
import { panelId } from './sections'

/**
 * Screen five, inverted: the deck ends on a dark screen so the scroll has an
 * ending, and the visitor can see they have reached it.
 *
 * The two direct links sit under the button because a person who has read five
 * screens and still wants to phone should not have to load another page first.
 * Only the primary button belongs here: a secondary button draws its outline
 * from the light-surface tokens and would be close to invisible on this ground.
 */
export const ContactPanel = () => {
  const { t } = useTranslation('home')
  const { locale } = useLocale()

  return (
    <Panel id={panelId('contact')} tone="inverted">
      <h2 className="text-(length:--text-4xl) font-semibold tracking-tight text-balance">
        {t('cta.title')}
      </h2>
      <p className="mx-auto mt-5 max-w-(--container-prose) text-(length:--text-lg) text-(--text-inverted)/80">
        {t('cta.body')}
      </p>

      <div className="mt-10 flex justify-center">
        <ButtonLink to={localePath(ROUTES.contact, locale)} size="lg">
          {t('cta.button')}
        </ButtonLink>
      </div>

      <ul className="mt-12 flex flex-wrap justify-center gap-x-8 text-(length:--text-sm)">
        <li>
          <a
            href={`mailto:${CONTACT.email}`}
            className="inline-flex min-h-11 items-center gap-2 text-(--text-inverted)/80 underline underline-offset-4 transition-colors hover:text-(--text-inverted)"
          >
            <Icon name="mail" className="h-4 w-4" />
            {CONTACT.email}
          </a>
        </li>
        <li>
          {/* tel: needs the E.164 form; the visible text is the readable one. */}
          <a
            href={`tel:${CONTACT.phoneE164}`}
            className="inline-flex min-h-11 items-center gap-2 text-(--text-inverted)/80 underline underline-offset-4 transition-colors hover:text-(--text-inverted)"
          >
            <Icon name="phone" className="h-4 w-4" />
            {CONTACT.phone}
          </a>
        </li>
      </ul>
    </Panel>
  )
}
