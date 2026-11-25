import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'

import type { PublicCharity } from '@shared/contracts'
import { CHARITY_SLUG_PARAM, ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { useSnapshot, type SnapshotState } from '@/hooks/useSnapshot'
import { localePath } from '@/lib/locale-path'
import { findBySlug } from '@/lib/snapshot'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Icon } from '@/components/ui/Icon'
import { ApiErrorNotice } from '@/components/charity/ApiErrorNotice'
import { CharityHeader } from '@/components/charity/CharityHeader'
import { CharityView } from '@/components/charity/CharityView'

/** The h1 for each state; the same element shows all of them. */
const headingFor = (t: TFunction, state: SnapshotState, charity: PublicCharity | undefined): string => {
  if (state.status === 'loading') return t('title')
  if (state.status === 'error') return t('loadError.title')
  return charity?.profile.organization.name ?? t('notFound.title')
}

/**
 * One charity's page, at `/organizacija/:slug`.
 *
 * The build prerenders one shell at `/organizacija` and the edge serves it
 * for every slug (viewer-request.js). The page reads the slug from the URL
 * and fills itself from the public snapshot in the browser; the first render
 * is the loading state, the same as the prerendered shell.
 */
export const CharityPage = () => {
  const { t } = useTranslation('charity')
  const { locale } = useLocale()
  const slug = useParams()[CHARITY_SLUG_PARAM]
  const snapshot = useSnapshot()
  const charity = snapshot.status === 'ready' ? findBySlug(snapshot.snapshot.charities, slug) : undefined
  const home = localePath(ROUTES.home, locale)

  const description =
    charity !== undefined
      ? t('meta.charityDescription', { name: charity.profile.organization.name, city: charity.profile.address.city })
      : t('meta.description')

  return (
    <>
      <Seo title={charity?.profile.organization.name ?? t('meta.title')} description={description} path={ROUTES.charity} locale={locale} />
      <Container className="space-y-8 py-6 sm:py-10">
        <ButtonLink to={home} variant="ghost" size="sm" className="-ml-3">
          <Icon name="arrowRight" className="rotate-180" />
          {t('back')}
        </ButtonLink>
        <CharityHeader title={headingFor(t, snapshot, charity)} charity={charity} />
        {snapshot.status === 'loading' && <PageSkeleton label={t('loading')} />}
        {snapshot.status === 'error' && <ApiErrorNotice error={snapshot.error} onRetry={snapshot.retry} className="max-w-xl" />}
        {snapshot.status === 'ready' && charity === undefined && (
          <div className="max-w-xl space-y-6">
            <p className="text-(length:--text-lg) text-(--text-secondary)">{t('notFound.body')}</p>
            <ButtonLink to={home}>{t('notFound.action')}</ButtonLink>
          </div>
        )}
        {snapshot.status === 'ready' && charity !== undefined && (
          <CharityView charity={charity} leaderboard={snapshot.snapshot.sponsorLeaderboard} />
        )}
      </Container>
    </>
  )
}

const PageSkeleton = ({ label }: { label: string }) => (
  <div aria-busy="true" className="space-y-8">
    <span className="sr-only" role="status">
      {label}
    </span>
    <div className="h-8 w-1/3 animate-pulse rounded-full bg-(--surface-sunken)" />
    <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="aspect-[16/10] animate-pulse rounded-(--radius-2xl) bg-(--surface-sunken)" />
      <div className="h-64 animate-pulse rounded-(--radius-2xl) bg-(--surface-sunken)" />
    </div>
  </div>
)
