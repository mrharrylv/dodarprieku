import { useTranslation } from 'react-i18next'

import { CONTACT, ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { Seo } from '@/components/seo/Seo'
import { ContactForm } from '@/components/contact/ContactForm'
import { Card } from '@/components/ui/Card'
import { Container } from '@/components/ui/Container'
import { LocationMap } from '@/components/contact/LocationMap'

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

      <Container className="py-16 sm:py-24">
        <h1 className="max-w-3xl text-(length:--text-4xl) text-(--text-primary)">
          {t('hero.title')}
        </h1>
        <p className="mt-5 max-w-2xl text-(length:--text-lg) text-(--text-secondary)">
          {t('hero.subtitle')}
        </p>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <ContactForm />
          </div>

          <aside>
            <Card className="bg-(--surface-sunken)">
              <h2 className="text-(length:--text-xl) text-(--text-primary)">
                {t('details.title')}
              </h2>
              <p className="mt-2 text-(length:--text-sm) text-(--text-secondary)">
                {t('details.body')}
              </p>

              <dl className="mt-6 space-y-4 text-(length:--text-sm)">
                <Detail label={tc('contactDetails.email')}>
                  <a
                    href={`mailto:${CONTACT.email}`}
                    className="text-(--text-accent) underline underline-offset-2"
                  >
                    {CONTACT.email}
                  </a>
                </Detail>

                <Detail label={tc('contactDetails.phone')}>
                  <a
                    href={`tel:${CONTACT.phoneE164}`}
                    className="text-(--text-accent) underline underline-offset-2"
                  >
                    {CONTACT.phone}
                  </a>
                </Detail>

                <Detail label={tc('contactDetails.address')}>
                  <address className="not-italic text-(--text-secondary)">
                    {CONTACT.address.street}
                    <br />
                    {CONTACT.address.postalCode} {CONTACT.address.city}
                    <br />
                    {CONTACT.address.country}
                  </address>
                </Detail>

                <Detail label={tc('contactDetails.hours')}>
                  <ul className="space-y-1 text-(--text-secondary)">
                    <li>
                      {tc('contactDetails.weekdays')}: {CONTACT.hours.weekdays}
                    </li>
                    <li>
                      {tc('contactDetails.saturday')}:{' '}
                      {CONTACT.hours.saturday ?? tc('contactDetails.closed')}
                    </li>
                    <li>
                      {tc('contactDetails.sunday')}:{' '}
                      {CONTACT.hours.sunday ?? tc('contactDetails.closed')}
                    </li>
                  </ul>
                </Detail>
              </dl>
            </Card>
          </aside>
        </div>
      </Container>
      <LocationMap />
    </>
  )
}

const Detail = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <dt className="font-semibold text-(--text-primary)">{label}</dt>
    <dd className="mt-1">{children}</dd>
  </div>
)
