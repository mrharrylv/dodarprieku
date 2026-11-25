import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/config/site'
import { SERVICES } from '@/data/services'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Panel } from './Panel'
import { panelId } from './sections'

/**
 * Screen three: the list, left aligned inside a centred column.
 *
 * The rows are the one place in the deck where text is not centred, because a
 * scannable list of four things is what a visitor came for and centred rows are
 * not scannable. Each row links to its own anchor on the services page.
 */
export const ServicesPanel = () => {
  const { t } = useTranslation('home')
  const { t: ts } = useTranslation('services')
  const { locale } = useLocale()
  const servicesPath = localePath(ROUTES.services, locale)

  return (
    <Panel id={panelId('services')}>
      <h2 className="text-(length:--text-4xl) font-semibold tracking-tight text-balance">
        {t('services.title')}
      </h2>
      <p className="mx-auto mt-5 max-w-(--container-prose) text-(length:--text-lg) text-(--text-secondary)">
        {t('services.subtitle')}
      </p>

      <ul className="mx-auto mt-12 max-w-(--container-prose) text-left">
        {SERVICES.map((service) => (
          <li key={service.key} className="border-t border-(--border-subtle) last:border-b">
            <Link
              to={`${servicesPath}#${service.slug}`}
              className="group flex min-h-16 items-center justify-between gap-5 py-5 transition-colors hover:text-(--text-accent)"
            >
              <span>
                <span className="block text-(length:--text-xl) font-semibold">
                  {ts(`items.${service.key}.title`)}
                </span>
                <span className="mt-1 block text-(length:--text-sm) text-(--text-secondary)">
                  {ts(`items.${service.key}.summary`)}
                </span>
              </span>
              <Icon
                name="arrowRight"
                className="h-5 w-5 shrink-0 text-(--text-accent) transition-transform duration-200 ease-(--ease-out-soft) group-hover:translate-x-1"
              />
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-10">
        <ButtonLink to={servicesPath} variant="secondary">
          {t('services.cta')}
        </ButtonLink>
      </div>
    </Panel>
  )
}
