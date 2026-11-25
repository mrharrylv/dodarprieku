import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'

import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { localePath, stripLocale } from '@/lib/locale-path'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'

export const NotFoundPage = () => {
  const { t } = useTranslation('common')
  const { locale } = useLocale()
  const { pathname } = useLocation()

  return (
    <>
      {/*
        The edge answers a missing page with a real 404 status and the
        prerendered 404.html (this page, in the default language). `noIndex`
        says it again in the markup, for a not-found page the router reaches
        in the browser, where there is no status code to set.
      */}
      <Seo
        title={t('notFound.title')}
        description={t('notFound.description')}
        path={stripLocale(pathname)}
        locale={locale}
        noIndex
      />

      <Container className="flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
        <p
          aria-hidden="true"
          className="font-(family-name:--font-display) text-(length:--text-5xl) font-semibold text-(--text-accent)"
        >
          404
        </p>
        <h1 className="mt-4 text-(length:--text-3xl) text-(--text-primary)">
          {t('notFound.title')}
        </h1>
        <p className="mt-4 max-w-md text-(--text-secondary)">
          {t('notFound.description')}
        </p>
        <div className="mt-8">
          <ButtonLink to={localePath(ROUTES.home, locale)}>
            {t('notFound.action')}
          </ButtonLink>
        </div>
      </Container>
    </>
  )
}
