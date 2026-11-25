import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { CONTACT, ROUTES } from '@/config/site'
import { HIGHLIGHTS, SERVICES } from '@/data/services'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Reveal } from '@/components/ui/Reveal'
import { Band } from './Band'
import { SplitSection } from './SplitSection'

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

      {/*
        The right half's first screen: one message, nothing under it until the
        visitor scrolls. `lg:min-h-dvh` makes that literal, so the split reads
        as identity on the left and a single promise on the right. Below `lg`
        it is an ordinary hero with ordinary padding, because a full-height
        hero on a phone is just a screen with no content on it.
      */}
      <section className="px-5 py-16 sm:px-8 sm:py-24 lg:flex lg:min-h-dvh lg:flex-col lg:justify-center lg:px-12">
        <div className="animate-rise-in max-w-(--container-content)">
          <p className="flex items-center gap-3 text-(length:--text-xs) font-semibold uppercase tracking-[0.18em] text-(--text-accent)">
            <span aria-hidden="true" className="block h-px w-8 bg-(--fill-accent)" />
            {t('hero.eyebrow')}
          </p>

          <h1 className="mt-6 max-w-[15ch] text-balance break-words font-(family-name:--font-display) text-(length:--text-5xl) font-semibold leading-[1.02] tracking-tight text-(--text-primary)">
            {t('hero.title')}
          </h1>

          <p className="mt-7 max-w-xl text-(length:--text-lg) text-(--text-secondary)">
            {t('hero.subtitle')}
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
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
          </div>
        </div>
      </section>

      <Band heading={t('highlights.title')} lead={t('highlights.subtitle')}>
        <Reveal as="ol" className="mt-10 border-t border-(--border-subtle)">
          {HIGHLIGHTS.map((key, index) => (
            <li
              key={key}
              className="grid gap-x-6 gap-y-2 border-b border-(--border-subtle) py-8 sm:grid-cols-[3rem_minmax(0,1fr)]"
            >
              {/* Decorative: the list is already an <ol>, so the numeral is
                  typography and a screen reader should not read it twice. */}
              <span
                aria-hidden="true"
                className="font-(family-name:--font-display) text-(length:--text-xl) tabular-nums text-(--text-muted)"
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="break-words font-(family-name:--font-display) text-(length:--text-xl) tracking-tight text-(--text-primary)">
                  {t(`highlights.items.${key}.title`)}
                </h3>
                <p className="mt-2 max-w-xl text-(--text-secondary)">
                  {t(`highlights.items.${key}.body`)}
                </p>
              </div>
            </li>
          ))}
        </Reveal>
      </Band>

      <Band
        heading={t('services.title')}
        lead={t('services.subtitle')}
        className="bg-(--surface-sunken)"
      >
        <Reveal as="ul" className="mt-10 border-t border-(--border-subtle)">
          {SERVICES.map((service) => (
            <li key={service.key} className="border-b border-(--border-subtle)">
              {/* The whole row is the link: one tab stop, and a target a thumb
                  cannot miss. A "read more" inside the row would give three
                  stops that all go to the same place. */}
              <Link
                to={`${localePath(ROUTES.services, locale)}#${service.slug}`}
                className="group grid items-baseline gap-x-8 gap-y-1 py-7 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]"
              >
                <h3 className="flex items-center gap-3 break-words font-(family-name:--font-display) text-(length:--text-xl) tracking-tight text-(--text-primary) transition-colors group-hover:text-(--text-accent)">
                  {ts(`items.${service.key}.title`)}
                  <Icon
                    name="arrowRight"
                    className="h-4 w-4 transition-transform duration-200 ease-(--ease-out-soft) group-hover:translate-x-1"
                  />
                </h3>
                <p className="text-(--text-secondary)">
                  {ts(`items.${service.key}.summary`)}
                </p>
              </Link>
            </li>
          ))}
        </Reveal>

        <div className="mt-10">
          <ButtonLink to={localePath(ROUTES.services, locale)} variant="secondary">
            {t('services.cta')}
          </ButtonLink>
        </div>
      </Band>

      <SplitSection heading={t('about.title')}>
        <p className="max-w-xl text-(length:--text-lg) text-(--text-secondary)">
          {t('about.body')}
        </p>
        <div className="mt-8">
          <ButtonLink to={localePath(ROUTES.about, locale)} variant="secondary">
            {t('about.cta')}
          </ButtonLink>
        </div>
      </SplitSection>

      <SplitSection flip tone="accent" heading={t('cta.title')} lead={t('cta.body')}>
        <div className="flex flex-wrap items-center gap-4">
          <ButtonLink to={localePath(ROUTES.contact, locale)} size="lg">
            {t('cta.button')}
          </ButtonLink>
          <a
            href={`tel:${CONTACT.phoneE164}`}
            className="inline-flex min-h-11 items-center gap-2 text-(length:--text-lg) text-(--text-accent) underline underline-offset-4"
          >
            <Icon name="phone" className="h-4 w-4" />
            {CONTACT.phone}
          </a>
        </div>
      </SplitSection>
    </>
  )
}
