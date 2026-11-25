import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { LocaleCode } from '@/config/site'
import { Seo } from '@/components/seo/Seo'
import { Container } from '@/components/ui/Container'
import { LEGAL_LAST_UPDATED } from './legal-values'

export const LegalShell = ({
  title,
  description,
  path,
  locale,
  children,
}: {
  title: string
  description: string
  path: string
  locale: LocaleCode
  children: ReactNode
}) => {
  const { t } = useTranslation('common')

  return (
    <>
      <Seo title={title} description={description} path={path} locale={locale} />

      <Container width="prose" className="py-16 sm:py-24">
        <h1 className="text-(length:--text-4xl) text-(--text-primary)">{title}</h1>
        <p className="mt-3 text-(length:--text-sm) text-(--text-muted)">
          {t('legal.updated')}:{' '}
          {/*
            UTC, because the date is a calendar day, not an instant: in the
            visitor's zone, midnight UTC is still the day before anywhere west
            of Greenwich. suppressHydrationWarning, because the page is
            prerendered by Node and hydrated by the browser, and their copies
            of the CLDR locale data may spell a Latvian or Russian month
            differently. Either spelling is right; neither is worth a failed
            hydration.
          */}
          <time dateTime={LEGAL_LAST_UPDATED} suppressHydrationWarning>
            {new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(
              new Date(LEGAL_LAST_UPDATED),
            )}
          </time>
        </p>

        <div className="prose-page mt-10">{children}</div>
      </Container>
    </>
  )
}

/** One section of a policy. */
export const LegalSection = ({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) => (
  <section>
    <h2>{title}</h2>
    {children}
  </section>
)
