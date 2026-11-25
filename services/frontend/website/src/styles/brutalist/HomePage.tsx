import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/config/site'
import { HIGHLIGHTS, SERVICES } from '@/data/services'
import { useLocale } from '@/hooks/useLocale'
import { cn } from '@/lib/cn'
import { localePath } from '@/lib/locale-path'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { CtaSlab } from './CtaSlab'
import { Hero } from './Hero'
import { LineCell, LineGrid } from './LineGrid'
import { Slab } from './Slab'
import { SpecStrip } from './SpecStrip'
import { FOCUS, HARD_EDGE, NUM, ordinal } from './marks'

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

      <Hero
        index={ordinal(1)}
        kicker={t('hero.eyebrow')}
        title={t('hero.title')}
        subtitle={t('hero.subtitle')}
      >
        <ButtonLink
          to={localePath(ROUTES.contact, locale)}
          size="lg"
          className={HARD_EDGE}
        >
          {t('hero.primaryCta')}
        </ButtonLink>
        <ButtonLink
          to={localePath(ROUTES.services, locale)}
          size="lg"
          variant="secondary"
          className={HARD_EDGE}
        >
          {t('hero.secondaryCta')}
        </ButtonLink>
      </Hero>

      <SpecStrip />

      <Slab
        index={ordinal(2)}
        title={t('highlights.title')}
        subtitle={t('highlights.subtitle')}
      >
        <LineGrid className="sm:grid-cols-2 lg:grid-cols-3">
          {HIGHLIGHTS.map((key, index) => (
            <LineCell key={key} index={ordinal(index + 1)}>
              <h3 className="break-words text-(length:--text-xl) font-bold uppercase tracking-[0.02em] text-(--text-primary)">
                {t(`highlights.items.${key}.title`)}
              </h3>
              <p className="mt-4 text-(--text-secondary)">
                {t(`highlights.items.${key}.body`)}
              </p>
            </LineCell>
          ))}
        </LineGrid>
      </Slab>

      <Slab
        index={ordinal(3)}
        tone="sunken"
        title={t('services.title')}
        subtitle={t('services.subtitle')}
      >
        <LineGrid className="sm:grid-cols-2">
          {SERVICES.map((service, index) => (
            <LineCell key={service.key} padded={false}>
              {/* The whole cell is the target. A link inside a bordered box
                  with a small hit area is the commonest way a grid like this
                  becomes unusable on a phone. */}
              <Link
                to={`${localePath(ROUTES.services, locale)}#${service.slug}`}
                className={cn(
                  'flex flex-1 flex-col p-6 transition-colors duration-150 hover:bg-(--surface-sunken) sm:p-8',
                  FOCUS,
                )}
              >
                <span aria-hidden="true" className={cn(NUM, 'mb-5 block')}>
                  {ordinal(index + 1)}
                </span>
                <h3 className="break-words text-(length:--text-xl) font-bold uppercase tracking-[0.02em] text-(--text-primary)">
                  {ts(`items.${service.key}.title`)}
                </h3>
                <p className="mt-4 text-(--text-secondary)">
                  {ts(`items.${service.key}.summary`)}
                </p>
              </Link>
            </LineCell>
          ))}
        </LineGrid>

        <div className="mt-10">
          {/* `sm`, not the default `md`: the shared button recipe sets
              whitespace-nowrap, and this is the longest label on the site
              (25 characters in Latvian). At --text-base in a monospace that
              label plus the medium padding is wider than the 280px of content
              a 320px screen leaves, and the band would clip. */}
          <ButtonLink
            to={localePath(ROUTES.services, locale)}
            size="sm"
            variant="secondary"
            className={HARD_EDGE}
          >
            {t('services.cta')}
          </ButtonLink>
        </div>
      </Slab>

      <Slab index={ordinal(4)} title={t('about.title')}>
        <div className="max-w-3xl">
          <p className="text-(length:--text-lg) text-(--text-secondary)">
            {t('about.body')}
          </p>
          <div className="mt-9">
            <ButtonLink
              to={localePath(ROUTES.about, locale)}
              variant="secondary"
              className={HARD_EDGE}
            >
              {t('about.cta')}
            </ButtonLink>
          </div>
        </div>
      </Slab>

      <CtaSlab
        index={ordinal(5)}
        title={t('cta.title')}
        body={t('cta.body')}
        action={t('cta.button')}
      />
    </>
  )
}
