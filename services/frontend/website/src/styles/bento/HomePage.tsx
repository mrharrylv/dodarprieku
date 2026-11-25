import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { HIGHLIGHTS, SERVICES } from '@/data/services'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { BandLabel } from './BandLabel'
import { CtaTile } from './CtaTile'
import { ContactTile, HeroTile } from './HomeTiles'
import {
  Tile,
  TileCue,
  TileEyebrow,
  TileGrid,
  TileLink,
  TileNumber,
} from './Tile'
import { HIGHLIGHT_SPANS, SERVICE_SPANS, SPAN_BESIDE_HERO, spanAt } from './spans'

/**
 * The home page is a map of the site: every tile is somewhere to go, and the
 * three tiles above the fold are the three pages in the navigation.
 *
 * One grid holds the whole page, labels included, so the tiles line up on the
 * same twelve columns from the hero to the last call to action. The order here
 * is the READING order, and the span classes are the only thing that decides
 * where a tile lands: nothing is moved visually past a neighbour, so tabbing
 * down the page follows what the eye does.
 */
export const HomePage = () => {
  const { t } = useTranslation('home')
  const { t: tc } = useTranslation('common')
  const { t: ts } = useTranslation('services')
  const { locale } = useLocale()

  const servicesPath = localePath(ROUTES.services, locale)

  return (
    <>
      <Seo
        title={t('meta.title')}
        description={t('meta.description')}
        path={ROUTES.home}
        locale={locale}
      />

      <Container className="pb-4 pt-1 sm:pt-2">
        <TileGrid>
          <HeroTile />
          <ContactTile />

          <TileLink
            to={localePath(ROUTES.about, locale)}
            tone="quiet"
            className={SPAN_BESIDE_HERO}
          >
            <TileEyebrow>{tc('nav.about')}</TileEyebrow>
            <h2 className="mt-3 text-(length:--text-xl) font-semibold tracking-tight text-(--text-primary)">
              {t('about.title')}
            </h2>
            <p className="mt-3 text-(--text-secondary)">{t('about.body')}</p>
            <TileCue>{t('about.cta')}</TileCue>
          </TileLink>

          <BandLabel
            title={t('highlights.title')}
            subtitle={t('highlights.subtitle')}
          />
          {HIGHLIGHTS.map((key, index) => (
            <Tile key={key} className={spanAt(HIGHLIGHT_SPANS, index)}>
              <h3 className="text-(length:--text-lg) font-semibold tracking-tight text-(--text-primary)">
                {t(`highlights.items.${key}.title`)}
              </h3>
              <p className="mt-3 text-(--text-secondary)">
                {t(`highlights.items.${key}.body`)}
              </p>
            </Tile>
          ))}

          <BandLabel
            title={t('services.title')}
            subtitle={t('services.subtitle')}
            action={
              <ButtonLink to={servicesPath} variant="secondary" size="sm">
                {t('services.cta')}
              </ButtonLink>
            }
          />
          {SERVICES.map((service, index) => (
            <TileLink
              key={service.key}
              to={`${servicesPath}#${service.slug}`}
              className={spanAt(SERVICE_SPANS, index)}
            >
              <TileNumber index={index} />
              <h3 className="mt-3 text-(length:--text-xl) font-semibold tracking-tight text-(--text-primary) transition-colors group-hover:text-(--text-accent)">
                {ts(`items.${service.key}.title`)}
              </h3>
              <p className="mt-2 text-(--text-secondary)">
                {ts(`items.${service.key}.summary`)}
              </p>
              <TileCue>{tc('cta.learnMore')}</TileCue>
            </TileLink>
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
