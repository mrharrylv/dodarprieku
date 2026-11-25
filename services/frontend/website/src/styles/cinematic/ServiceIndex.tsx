import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { ROUTES, type LocaleCode } from '@/config/site'
import { SERVICES } from '@/data/services'
import { localePath } from '@/lib/locale-path'
import { Icon } from '@/components/ui/Icon'
import { Reveal } from '@/components/ui/Reveal'

/**
 * The services, as an index of full width rows rather than a grid of cards.
 *
 * Each row is one link and therefore one tab stop. A row with a heading link
 * plus a "learn more" link gives a keyboard user two stops that go to the same
 * place, and a screen reader two announcements of it.
 *
 * The arrow is decorative and moves on hover only; the hit area is the whole
 * row, which on a phone is far easier to hit than a card's title.
 */
export const ServiceIndex = ({ locale }: { locale: LocaleCode }) => {
  const { t } = useTranslation('services')

  return (
    <ul className="border-t border-(--border-subtle)">
      {SERVICES.map((service, index) => (
        <li key={service.key} className="border-b border-(--border-subtle)">
          <Reveal delay={0.1 + index * 0.12}>
            <Link
              to={`${localePath(ROUTES.services, locale)}#${service.slug}`}
              className="group flex flex-col gap-4 py-9 transition-colors sm:flex-row sm:items-center sm:gap-10 sm:py-12"
            >
              <span
                aria-hidden="true"
                className="font-(family-name:--font-display) text-(length:--text-xs) font-semibold uppercase tracking-[0.34em] text-(--text-accent) sm:w-16"
              >
                {String(index + 1).padStart(2, '0')}
              </span>

              <div className="flex-1">
                <h3 className="text-(length:--text-3xl) text-(--text-primary) transition-colors group-hover:text-(--text-accent)">
                  {t(`items.${service.key}.title`)}
                </h3>
                <p className="mt-3 text-(--text-secondary)">
                  {t(`items.${service.key}.summary`)}
                </p>
              </div>

              <Icon
                name="arrowRight"
                className="h-6 w-6 shrink-0 text-(--text-accent) transition-transform duration-300 ease-(--ease-out-soft) group-hover:translate-x-2"
              />
            </Link>
          </Reveal>
        </li>
      ))}
    </ul>
  )
}
