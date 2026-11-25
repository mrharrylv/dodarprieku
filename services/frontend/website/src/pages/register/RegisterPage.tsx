import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { useHydrated } from '@/hooks/useHydrated'
import { useLocale } from '@/hooks/useLocale'
import { RegisterWizard } from '@/components/register/RegisterWizard'
import { Seo } from '@/components/seo/Seo'
import { Container } from '@/components/ui/Container'

/**
 * The registration wizard at `/registreties`. The page is prerendered, so the
 * first render is the empty first step; once hydrated the wizard is mounted
 * again with the visitor's session draft, if there is one.
 */
export const RegisterPage = () => {
  const { t } = useTranslation('register')
  const { locale } = useLocale()
  const hydrated = useHydrated()

  return (
    <>
      <Seo title={t('meta.title')} description={t('meta.description')} path={ROUTES.register} locale={locale} />
      <Container className="py-12 sm:py-16">
        <div className="mx-auto max-w-4xl">
        <header className="mb-10 text-center">
          <p className="text-(length:--text-sm) font-medium tracking-wide text-(--text-accent) uppercase">{t('eyebrow')}</p>
          <h1 className="mt-2 font-display text-(length:--text-4xl) text-(--text-primary)">{t('title')}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-(length:--text-lg) text-(--text-secondary)">{t('intro')}</p>
        </header>
          <RegisterWizard key={hydrated ? 'client' : 'server'} restore={hydrated} />
        </div>
      </Container>
    </>
  )
}
