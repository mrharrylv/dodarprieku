import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { Seo } from '@/components/seo/Seo'
import { Hero } from './Hero'
import { HighlightsPanel } from './HighlightsPanel'
import { ServicesPanel } from './ServicesPanel'
import { AboutPanel } from './AboutPanel'
import { ContactPanel } from './ContactPanel'
import { SectionDots } from './SectionDots'

/**
 * The home page is the deck: five screens, one idea each.
 *
 * `paged-deck` is not decoration. tokens.css matches on it with :has() and
 * turns scroll snapping on for this page only, so the services, about, contact
 * and legal pages keep scrolling the way a document should. Remove the class
 * and the deck becomes a long page that still reads correctly, which is also
 * what a browser without :has() gets.
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

      <div className="paged-deck">
        <SectionDots />
        <Hero />
        <HighlightsPanel />
        <ServicesPanel />
        <AboutPanel />
        <ContactPanel />
      </div>
    </>
  )
}
