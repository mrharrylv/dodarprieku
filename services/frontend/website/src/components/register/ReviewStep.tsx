import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { LIMITS } from '@shared/contracts'

import { ErrorText, Fieldset } from '@/components/profile-editor/controls'
import { useFieldError } from '@/components/profile-editor/useFieldError'
import { Input } from '@/components/ui/Field'
import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { ProfileSummary } from './ProfileSummary'
import type { RegisterWizardState } from './useRegisterWizard'

/** Step 6: the summary, the login email, the terms, and a honeypot only bots fill in. */
export const ReviewStep = ({ wizard }: { wizard: RegisterWizardState }) => {
  const { t } = useTranslation('register')
  const error = useFieldError(wizard.errors)
  const termsId = useId()
  const { locale } = useLocale()
  const termsError = error('acceptTerms')

  return (
    <div className="space-y-10">
      <ProfileSummary form={wizard.form} onEdit={wizard.goTo} />

      <Fieldset legend={t('review.accountLegend')} hint={t('review.accountHint')}>
        <Input label={t('review.accountEmail')} type="email" required autoComplete="email" maxLength={LIMITS.email}
          value={wizard.accountEmail} hint={t('review.accountEmailHint')} error={error('accountEmail')}
          onChange={(e) => wizard.setAccountEmail(e.target.value)} />

        <div>
          <label className="flex min-h-11 cursor-pointer items-start gap-3">
            <input type="checkbox" checked={wizard.acceptTerms} onChange={(e) => wizard.setAcceptTerms(e.target.checked)}
              aria-invalid={termsError !== undefined || undefined}
              aria-describedby={termsError === undefined ? undefined : `${termsId}-error`}
              className="mt-0.5 h-6 w-6 shrink-0 accent-(--fill-accent)" />
            <span className="text-(--text-primary)">
              {t('review.termsBefore')}{' '}
              <Link to={localePath(ROUTES.terms, locale)} target="_blank" className="text-(--text-accent) underline underline-offset-4">
                {t('review.termsLink')}
              </Link>{' '}
              {t('review.termsMiddle')}{' '}
              <Link to={localePath(ROUTES.privacy, locale)} target="_blank" className="text-(--text-accent) underline underline-offset-4">
                {t('review.privacyLink')}
              </Link>
              {t('review.termsAfter')}
            </span>
          </label>
          {termsError !== undefined && <ErrorText id={`${termsId}-error`}>{termsError}</ErrorText>}
        </div>

        {/* Honeypot: hidden from people and from assistive technology; a bot fills every field. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            {t('review.honeypot')}
            <input type="text" tabIndex={-1} autoComplete="off" value={wizard.honeypot} onChange={(e) => wizard.setHoneypot(e.target.value)} />
          </label>
        </div>
      </Fieldset>
    </div>
  )
}
