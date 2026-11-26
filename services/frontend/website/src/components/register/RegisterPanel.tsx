import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'

import type { PublicCharity } from '@shared/contracts'
import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { useSnapshot } from '@/hooks/useSnapshot'
import { localePath } from '@/lib/locale-path'
import { findBySlug } from '@/lib/snapshot'
import { CLAIM_PARAM } from '@/components/charity/focus-param'
import { Alert } from '@/components/ui/Alert'
import { RegisterWizard } from './RegisterWizard'

/**
 * "Kļūt par saņēmēju" in its half-screen panel over the map (`/registreties`).
 * The panel opens only in the browser, after hydration, so the wizard picks
 * up the visitor's session draft on its first mount.
 *
 * `/registreties?pieprasit=<slug>` is a claim of an imported, unclaimed
 * charity: the wizard starts from its public profile under a banner naming it.
 */
export const RegisterPanel = () => {
  const { t } = useTranslation('register')
  const [params] = useSearchParams()
  const slug = params.get(CLAIM_PARAM)
  return (
    <div className="space-y-6">
      <p className="text-(--text-secondary)">{t('intro')}</p>
      {slug === null ? <RegisterWizard restore /> : <ClaimWizard slug={slug} />}
    </div>
  )
}

const ClaimWizard = ({ slug }: { slug: string }) => {
  const { t } = useTranslation('register')
  const snapshot = useSnapshot()
  if (snapshot.status === 'loading') {
    return (
      <p role="status" className="py-10 text-center text-(--text-muted)">
        {t('claim.loading')}
      </p>
    )
  }
  const found = snapshot.status === 'ready' ? findBySlug(snapshot.snapshot.charities, slug) : undefined
  if (found === undefined || found.claimable !== true) {
    return (
      <>
        <Alert tone="info" title={t('claim.missingTitle')}>
          {t('claim.missingBody')}
        </Alert>
        <RegisterWizard restore />
      </>
    )
  }
  return (
    <>
      <ClaimBanner charity={found} />
      <RegisterWizard key={found.id} restore={false} claim={found} />
    </>
  )
}

const ClaimBanner = ({ charity }: { charity: PublicCharity }) => {
  const { t } = useTranslation('register')
  const { locale } = useLocale()
  return (
    <Alert tone="info" title={t('claim.banner', { name: charity.profile.organization.name })}>
      <span className="block">{t('claim.body')}</span>
      <Link to={localePath(ROUTES.register, locale)} className="mt-1 inline-flex min-h-11 items-center font-medium underline underline-offset-4">
        {t('claim.cancel')}
      </Link>
    </Alert>
  )
}
