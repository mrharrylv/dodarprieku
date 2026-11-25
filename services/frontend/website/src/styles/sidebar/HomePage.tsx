import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { HIGHLIGHTS, SERVICES } from '@/data/services'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { ActionPanel } from './ActionPanel'
import { Band } from './Band'
import { PageHead } from './PageHead'
import { NumberChip, Panel, RowLink } from './Panel'

export const HomePage = () => {
  const { t } = useTranslation('home')
  const { t: ts } = useTranslation('services')
  const { locale } = useLocale()

  return (
    <>
      <Seo
        title={t('meta.title')}
        description={t('meta.description')}
        path={ROUTES.home}
        locale={locale}
      />

      {/* The page's only <h1>. */}
      <PageHead
        hero
        label={t('hero.eyebrow')}
        title={t('hero.title')}
        subtitle={t('hero.subtitle')}
      >
        <ButtonLink to={localePath(ROUTES.contact, locale)} size="lg">
          {t('hero.primaryCta')}
        </ButtonLink>
        <ButtonLink
          to={localePath(ROUTES.services, locale)}
          size="lg"
          variant="secondary"
        >
          {t('hero.secondaryCta')}
        </ButtonLink>
      </PageHead>

      <Band index={1} title={t('highlights.title')} description={t('highlights.subtitle')}>
        {/* The one entrance animation on the site. Everything below the fold
            here is a short list, so staggering more of them would only delay
            reading. */}
        <Reveal as="ul" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HIGHLIGHTS.map((key, index) => (
            <li key={key}>
              <Panel className="h-full">
                <NumberChip n={index + 1} />
                <h3 className="mt-3 text-(length:--text-lg) text-(--text-primary)">
                  {t(`highlights.items.${key}.title`)}
                </h3>
                <p className="mt-2 text-(length:--text-sm) text-(--text-secondary)">
                  {t(`highlights.items.${key}.body`)}
                </p>
              </Panel>
            </li>
          ))}
        </Reveal>
      </Band>

      <Band index={2} title={t('services.title')} description={t('services.subtitle')}>
        <ul className="overflow-hidden rounded-(--radius-lg) border border-(--border-subtle) bg-(--surface-raised)">
          {SERVICES.map((service) => (
            <li key={service.key} className="border-t border-(--border-subtle) first:border-t-0">
              <RowLink
                to={`${localePath(ROUTES.services, locale)}#${service.slug}`}
                title={ts(`items.${service.key}.title`)}
              >
                {ts(`items.${service.key}.summary`)}
              </RowLink>
            </li>
          ))}
        </ul>

        <div className="mt-4">
          <ButtonLink
            to={localePath(ROUTES.services, locale)}
            variant="secondary"
            size="sm"
          >
            {t('services.cta')}
          </ButtonLink>
        </div>
      </Band>

      <Band index={3} title={t('about.title')}>
        <Panel className="sm:p-7">
          {/* max-w-2xl rather than the panel's full width: the content column
              is 80rem here, and one paragraph set that wide stops reading. */}
          <p className="max-w-2xl text-(length:--text-lg) text-(--text-secondary)">
            {t('about.body')}
          </p>
          <div className="mt-5">
            <ButtonLink
              to={localePath(ROUTES.about, locale)}
              variant="secondary"
              size="sm"
            >
              {t('about.cta')}
            </ButtonLink>
          </div>
        </Panel>
      </Band>

      {/* The closing call to action is its own section, as on the other two
          pages. Inside the about band it would have had to carry an h3, and
          the outline would then file "Tell us what you need" as a subsection
          of "Who you are dealing with". */}
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
