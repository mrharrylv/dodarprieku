import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { cn } from '@/lib/cn'
import { Seo } from '@/components/seo/Seo'
import { ContactForm } from '@/components/contact/ContactForm'
import { Container } from '@/components/ui/Container'
import { ContactDetails } from './ContactDetails'
import { Tile, TileEyebrow, TileGrid } from './Tile'
import { SPAN_FULL } from './spans'
import { LocationMap } from '@/components/contact/LocationMap'

/**
 * Contact: the opener, the shared form, and the details tile.
 *
 * The form is the shared component, mounted as is. It ships no surface of its
 * own, so the tile around it is what gives it one, and the page keeps the same
 * grid as the rest of the site.
 *
 * The form comes before the details in the DOM as well as on screen: someone
 * who landed here to write a message should reach the first field on the next
 * Tab, not after four contact rows.
 */
export const ContactPage = () => {
  const { t } = useTranslation('contact')
  const { t: tc } = useTranslation('common')
  const { locale } = useLocale()

  return (
    <>
      <Seo
        title={t('meta.title')}
        description={t('meta.description')}
        path={ROUTES.contact}
        locale={locale}
      />

      <Container className="pb-4 pt-1 sm:pt-2">
        <TileGrid>
          <Tile className={cn(SPAN_FULL, 'sm:p-10')}>
            <TileEyebrow>{tc('nav.contact')}</TileEyebrow>
            <h1 className="mt-4 max-w-3xl text-balance text-(length:--text-4xl) font-semibold tracking-tight text-(--text-primary)">
              {t('hero.title')}
            </h1>
            <p className="mt-5 max-w-2xl text-(length:--text-lg) text-(--text-secondary)">
              {t('hero.subtitle')}
            </p>
          </Tile>

          <Tile className="sm:col-span-6 lg:col-span-7">
            <ContactForm />
          </Tile>

          <ContactDetails />
        </TileGrid>
      </Container>
      <LocationMap />
    </>
  )
}
