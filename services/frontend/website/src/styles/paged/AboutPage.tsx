import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { VALUES } from '@/data/services'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { Band, BandHeading } from './Band'
import { PageIntro } from './PageIntro'

/**
 * No eyebrow on this page: the nav label and the page title say the same word
 * in most languages, and stacking them looks like a mistake rather than a
 * flourish.
 */
export const AboutPage = () => {
  const { t } = useTranslation('about')
  const { locale } = useLocale()

  return (
    <>
      <Seo
        title={t('meta.title')}
        description={t('meta.description')}
        path={ROUTES.about}
        locale={locale}
      />

      <PageIntro title={t('hero.title')} subtitle={t('hero.subtitle')} />

      <Band>
        <div className="mx-auto max-w-(--container-prose)">
          <h2 className="text-(length:--text-2xl) font-semibold tracking-tight">
            {t('story.title')}
          </h2>
          {/* whitespace-pre-line so the owner can break the story into
              paragraphs in the locale file without markup reaching the JSON. */}
          <p className="mt-6 whitespace-pre-line text-(length:--text-lg) leading-relaxed text-(--text-secondary)">
            {t('story.body')}
          </p>
        </div>
      </Band>

      <Band tone="sunken">
        <BandHeading title={t('values.title')} />

        <ul className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-0">
          {VALUES.map((key, index) => (
            <li
              key={key}
              className="border-t border-(--border-subtle) pt-8 first:border-t-0 first:pt-0 sm:border-l sm:border-t-0 sm:px-6 sm:pt-0 sm:first:border-l-0 sm:first:pl-0"
            >
              <span
                aria-hidden="true"
                className="block font-(family-name:--font-display) text-(length:--text-2xl) font-semibold text-(--text-accent)"
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-4 text-(length:--text-xl) font-semibold">
                {t(`values.items.${key}.title`)}
              </h3>
              <p className="mt-3 text-(--text-secondary)">
                {t(`values.items.${key}.body`)}
              </p>
            </li>
          ))}
        </ul>
      </Band>

      <Band tone="inverted">
        <BandHeading title={t('cta.title')} subtitle={t('cta.body')} tone="inverted" />
        <div className="mt-10 flex justify-center">
          <ButtonLink to={localePath(ROUTES.contact, locale)} size="lg">
            {t('cta.button')}
          </ButtonLink>
        </div>
      </Band>
    </>
  )
}
