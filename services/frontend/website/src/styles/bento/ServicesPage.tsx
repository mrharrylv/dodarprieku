import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { PROCESS_STEPS, SERVICES } from '@/data/services'
import { useLocale } from '@/hooks/useLocale'
import { cn } from '@/lib/cn'
import { Seo } from '@/components/seo/Seo'
import { Container } from '@/components/ui/Container'
import { BandLabel } from './BandLabel'
import { CtaTile } from './CtaTile'
import { Tile, TileEyebrow, TileGrid, TileNumber } from './Tile'
import { SERVICE_SPANS, SPAN_FULL, SPAN_THIRD, spanAt } from './spans'

/**
 * The services page keeps the tile language: the same grid, one tile per
 * service, at full detail rather than the one-line summary the home page shows.
 *
 * Each tile carries its slug as an id so the home page can link straight to
 * it, and `scroll-mt` clears the floating header when that link is followed.
 * Without it the heading lands underneath the bar.
 */
export const ServicesPage = () => {
  const { t } = useTranslation('services')
  const { t: tc } = useTranslation('common')
  const { locale } = useLocale()

  return (
    <>
      <Seo
        title={t('meta.title')}
        description={t('meta.description')}
        path={ROUTES.services}
        locale={locale}
      />

      <Container className="pb-4 pt-1 sm:pt-2">
        <TileGrid>
          <Tile className={cn(SPAN_FULL, 'sm:p-10')}>
            <TileEyebrow>{tc('nav.services')}</TileEyebrow>
            <h1 className="mt-4 max-w-3xl text-balance text-(length:--text-4xl) font-semibold tracking-tight text-(--text-primary)">
              {t('hero.title')}
            </h1>
            <p className="mt-5 max-w-2xl text-(length:--text-lg) text-(--text-secondary)">
              {t('hero.subtitle')}
            </p>
          </Tile>

          {SERVICES.map((service, index) => (
            <Tile
              key={service.key}
              id={service.slug}
              className={cn(spanAt(SERVICE_SPANS, index), 'scroll-mt-28')}
            >
              <TileNumber index={index} />
              <h2 className="mt-3 text-(length:--text-2xl) font-semibold tracking-tight text-(--text-primary)">
                {t(`items.${service.key}.title`)}
              </h2>
              <p className="mt-2 text-(length:--text-lg) text-(--text-accent)">
                {t(`items.${service.key}.summary`)}
              </p>
              <p className="mt-4 text-(--text-secondary)">
                {t(`items.${service.key}.body`)}
              </p>
            </Tile>
          ))}

          <BandLabel title={t('process.title')} />
          {PROCESS_STEPS.map((step, index) => (
            <Tile key={step} tone="quiet" className={SPAN_THIRD}>
              <TileNumber index={index} />
              <h3 className="mt-3 text-(length:--text-lg) font-semibold tracking-tight text-(--text-primary)">
                {t(`process.steps.${step}.title`)}
              </h3>
              <p className="mt-2 text-(--text-secondary)">
                {t(`process.steps.${step}.body`)}
              </p>
            </Tile>
          ))}

          <CtaTile
            title={t('cta.title')}
            body={t('cta.body')}
            action={t('cta.button')}
          />
        </TileGrid>
      </Container>
    </>
  )
}
