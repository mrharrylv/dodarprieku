import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { HIGHLIGHTS } from '@/data/services'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { Band } from './Band'
import { Glow } from './Decor'
import { Hero } from './Hero'
import { Pillars } from './Pillars'
import { ServiceIndex } from './ServiceIndex'

/**
 * Home: one full height opening shot, then three wide bands with a lot of air
 * between them. No cards anywhere. On a dark page every extra border is another
 * edge competing with the headline, so the structure is carried by space and by
 * the page darkening a step when a band changes tone.
 */
export const HomePage = () => {
  const { t } = useTranslation('home')
  const { locale } = useLocale()

  return (
    <>
      <Seo
        title={t('meta.title')}
        description={t('meta.description')}
        path={ROUTES.home}
        locale={locale}
      />

      {/* The page's only <h1> lives in here. */}
      <Hero />

      <Band title={t('highlights.title')} subtitle={t('highlights.subtitle')}>
        <Pillars
          items={HIGHLIGHTS.map((key) => ({
            key,
            title: t(`highlights.items.${key}.title`),
            body: t(`highlights.items.${key}.body`),
          }))}
        />
      </Band>

      <Band tone="sunken" title={t('services.title')} subtitle={t('services.subtitle')}>
        <ServiceIndex locale={locale} />

        <div className="mt-14">
          <ButtonLink
            to={localePath(ROUTES.services, locale)}
            variant="secondary"
            className="uppercase tracking-[0.16em]"
          >
            {t('services.cta')}
          </ButtonLink>
        </div>
      </Band>

      <Band title={t('about.title')} subtitle={t('about.body')}>
        <ButtonLink
          to={localePath(ROUTES.about, locale)}
          variant="secondary"
          className="uppercase tracking-[0.16em]"
        >
          {t('about.cta')}
        </ButtonLink>
      </Band>

      <Band tone="sunken" align="center" title={t('cta.title')} subtitle={t('cta.body')}>
        <div className="flex justify-center">
          <Glow>
            <ButtonLink
              to={localePath(ROUTES.contact, locale)}
              size="lg"
              className="uppercase tracking-[0.16em]"
            >
              {t('cta.button')}
            </ButtonLink>
          </Glow>
        </div>
      </Band>
    </>
  )
}
