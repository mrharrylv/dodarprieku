import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { VALUES } from '@/data/services'
import { useLocale } from '@/hooks/useLocale'
import { Seo } from '@/components/seo/Seo'
import { Container } from '@/components/ui/Container'
import { ClosingCta } from './ClosingCta'
import { NoteGrid } from './NoteGrid'
import { PageIntro } from './PageIntro'
import { SectionHeading } from './SectionHeading'

/**
 * About is the one page that is mostly running text, so it is the one page set
 * at the prose width throughout: the story column never widens past about 65
 * characters however large the window gets.
 */
export const AboutPage = () => {
  const { t } = useTranslation('about')
  const { t: tc } = useTranslation('common')
  const { locale } = useLocale()

  return (
    <>
      <Seo
        title={t('meta.title')}
        description={t('meta.description')}
        path={ROUTES.about}
        locale={locale}
      />

      <PageIntro kicker={tc('nav.about')} title={t('hero.title')} subtitle={t('hero.subtitle')} />

      <section>
        <Container width="prose" className="py-12 sm:py-16">
          <SectionHeading title={t('story.title')} />
          {/* The drop cap is a first-letter pseudo element, not a span, so the
              text stays one selectable, translatable string and a screen
              reader hears a word rather than a letter and a word. leading
              under 1 is what makes the cap sit on the third line instead of
              pushing the paragraph down. */}
          <p className="mt-8 text-(length:--text-lg) leading-relaxed text-(--text-secondary) first-letter:float-left first-letter:mt-1 first-letter:mr-3 first-letter:font-(family-name:--font-display) first-letter:text-(length:--text-5xl) first-letter:font-semibold first-letter:leading-[0.72] first-letter:text-(--text-accent)">
            {t('story.body')}
          </p>
        </Container>
      </section>

      <section>
        <Container className="pb-12 sm:pb-16">
          <SectionHeading title={t('values.title')} />
          <NoteGrid
            className="mt-8"
            items={VALUES.map((key) => ({
              key,
              title: t(`values.items.${key}.title`),
              body: t(`values.items.${key}.body`),
            }))}
          />
        </Container>
      </section>

      <ClosingCta title={t('cta.title')} body={t('cta.body')} action={t('cta.button')} />
    </>
  )
}
