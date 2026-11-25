import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { Seo } from '@/components/seo/Seo'
import { ContactForm } from '@/components/contact/ContactForm'
import { Block, BlockIntro, Lede, Page, PageTitle } from './Rhythm'
import { ContactDetails } from './ContactDetails'
import { LocationMap } from '@/components/contact/LocationMap'

/**
 * Contact. The form first and the details under it, in one column: on a
 * 52rem page a side-by-side layout would give the form 30rem and the details
 * 18rem, and both would be worse than either is alone.
 *
 * The form is the shared ContactForm. Its own legend titles it, so this page
 * adds no heading above it and the document outline stays h1, h2.
 */
export const ContactPage = () => {
  const { t } = useTranslation('contact')
  const { locale } = useLocale()

  return (
    <>
      <Seo
        title={t('meta.title')}
        description={t('meta.description')}
        path={ROUTES.contact}
        locale={locale}
      />

      <Page>
        <div>
          <PageTitle>{t('hero.title')}</PageTitle>
          <Lede>{t('hero.subtitle')}</Lede>
        </div>

        <Block>
          <ContactForm />
        </Block>

        <Block>
          <BlockIntro title={t('details.title')} subtitle={t('details.body')} />
          <ContactDetails />
        </Block>
      </Page>
      <LocationMap />
    </>
  )
}
