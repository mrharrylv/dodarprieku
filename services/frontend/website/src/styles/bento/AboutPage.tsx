import { useTranslation } from 'react-i18next'

import { ROUTES, SITE } from '@/config/site'
import { VALUES } from '@/data/services'
import { useLocale } from '@/hooks/useLocale'
import { cn } from '@/lib/cn'
import { Seo } from '@/components/seo/Seo'
import { Container } from '@/components/ui/Container'
import { BandLabel } from './BandLabel'
import { CtaTile } from './CtaTile'
import { Tile, TileEyebrow, TileGrid, TileNumber } from './Tile'
import { SPAN_FULL, SPAN_THIRD } from './spans'

/**
 * About, as tiles: the story in the wide one, the promise in the quiet one
 * beside it, then a tile per value.
 *
 * The promise tile carries no heading. It is a statement, and giving it an h2
 * would put a heading in the outline that says nothing a reader can navigate
 * by.
 */
export const AboutPage = () => {
  const { t } = useTranslation('about')
  const { t: tc } = useTranslation('common')
  const { t: th } = useTranslation('home')
  const { locale } = useLocale()

  return (
    <>
      <Seo
        title={t('meta.title')}
        description={t('meta.description')}
        path={ROUTES.about}
        locale={locale}
      />

      <Container className="pb-4 pt-1 sm:pt-2">
        <TileGrid>
          <Tile className={cn(SPAN_FULL, 'sm:p-10')}>
            <TileEyebrow>{tc('nav.about')}</TileEyebrow>
            <h1 className="mt-4 max-w-3xl text-balance text-(length:--text-4xl) font-semibold tracking-tight text-(--text-primary)">
              {t('hero.title')}
            </h1>
            <p className="mt-5 max-w-2xl text-(length:--text-lg) text-(--text-secondary)">
              {t('hero.subtitle')}
            </p>
          </Tile>

          <Tile className="sm:col-span-6 lg:col-span-7">
            <h2 className="text-(length:--text-2xl) font-semibold tracking-tight text-(--text-primary)">
              {t('story.title')}
            </h2>
            <p className="mt-4 text-(--text-secondary)">{t('story.body')}</p>
          </Tile>

          <Tile tone="quiet" className="justify-center sm:col-span-6 lg:col-span-5">
            {/* The promise, not the footer tagline: the footer prints that
                tagline at the bottom of this very page, and quoting it here
                printed the same sentence twice on one screen. */}
            <p className="text-(length:--text-2xl) font-semibold tracking-tight text-balance text-(--text-primary)">
              {th('hero.title')}
            </p>
            <p className="mt-4 text-(length:--text-xs) font-semibold uppercase tracking-[0.16em] text-(--text-muted)">
              {SITE.name}
            </p>
          </Tile>

          <BandLabel title={t('values.title')} />
          {VALUES.map((key, index) => (
            <Tile key={key} className={SPAN_THIRD}>
              <TileNumber index={index} />
              <h3 className="mt-3 text-(length:--text-lg) font-semibold tracking-tight text-(--text-primary)">
                {t(`values.items.${key}.title`)}
              </h3>
              <p className="mt-3 text-(--text-secondary)">
                {t(`values.items.${key}.body`)}
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
