import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/config/site'
import { PROCESS_STEPS, SERVICES } from '@/data/services'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { Seo } from '@/components/seo/Seo'
import { ActionPanel } from './ActionPanel'
import { Band } from './Band'
import { PageHead } from './PageHead'
import { NumberChip, Panel } from './Panel'

export const ServicesPage = () => {
  const { t } = useTranslation('services')
  const { t: tc } = useTranslation('common')
  const { locale } = useLocale()

  const here = localePath(ROUTES.services, locale)

  return (
    <>
      <Seo
        title={t('meta.title')}
        description={t('meta.description')}
        path={ROUTES.services}
        locale={locale}
      />

      <PageHead
        label={tc('nav.services')}
        title={t('hero.title')}
        subtitle={t('hero.subtitle')}
      />

      <Band>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] lg:gap-8">
          {/*
            An index of what is on this page, sticky beside the detail. It is a
            plain list rather than a <nav>: a second navigation landmark on the
            page competes with the rail when someone jumps by landmark, and
            these are in-page anchors, not site navigation.
            `self-start` is what lets it stick: a stretched grid item fills its
            row and has no room left to move.
          */}
          <ul className="hidden lg:sticky lg:top-8 lg:block lg:self-start">
            {SERVICES.map((service, index) => (
              <li key={service.key}>
                <Link
                  to={`${here}#${service.slug}`}
                  className="flex min-h-11 items-center gap-3 rounded-(--radius-md) px-3 text-(length:--text-sm) text-(--text-secondary) transition-colors hover:bg-(--surface-raised) hover:text-(--text-accent)"
                >
                  <span
                    aria-hidden="true"
                    className="font-(family-name:--font-display) text-(length:--text-xs) tabular-nums text-(--text-muted)"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="truncate">{t(`items.${service.key}.title`)}</span>
                </Link>
              </li>
            ))}
          </ul>

          <ul className="grid gap-3">
            {SERVICES.map((service) => (
              // scroll-mt clears the top bar when the anchor is followed from
              // the home page on a phone; without it the heading lands under it.
              <li key={service.key} id={service.slug} className="scroll-mt-20">
                <Panel>
                  <h2 className="text-(length:--text-xl) text-(--text-primary)">
                    {t(`items.${service.key}.title`)}
                  </h2>
                  <p className="mt-1 text-(length:--text-sm) font-medium text-(--text-accent)">
                    {t(`items.${service.key}.summary`)}
                  </p>
                  <p className="mt-3 text-(--text-secondary)">
                    {t(`items.${service.key}.body`)}
                  </p>
                </Panel>
              </li>
            ))}
          </ul>
        </div>
      </Band>

      <Band index={1} title={t('process.title')}>
        <ol className="grid gap-3 sm:grid-cols-3">
          {PROCESS_STEPS.map((step, index) => (
            <li key={step}>
              <Panel className="h-full">
                <NumberChip n={index + 1} />
                <h3 className="mt-3 text-(length:--text-lg) text-(--text-primary)">
                  {t(`process.steps.${step}.title`)}
                </h3>
                <p className="mt-2 text-(length:--text-sm) text-(--text-secondary)">
                  {t(`process.steps.${step}.body`)}
                </p>
              </Panel>
            </li>
          ))}
        </ol>
      </Band>

      <Band>
        <ActionPanel
          title={t('cta.title')}
          body={t('cta.body')}
          action={t('cta.button')}
          to={localePath(ROUTES.contact, locale)}
        />
      </Band>
    </>
  )
}
