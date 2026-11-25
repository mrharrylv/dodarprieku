import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { AboutSection } from '@/components/profile-editor/AboutSection'
import { ERROR_SELECTOR } from '@/components/profile-editor/control-styles'
import { DeliverySection } from '@/components/profile-editor/DeliverySection'
import { LocationSection } from '@/components/profile-editor/LocationSection'
import { NeedsSection } from '@/components/profile-editor/NeedsSection'
import { OrganizationSection } from '@/components/profile-editor/OrganizationSection'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { CONTACT } from '@/config/site'
import { ReviewStep } from './ReviewStep'
import { SuccessScreen } from './SuccessScreen'
import { useRegisterWizard } from './useRegisterWizard'
import { REVIEW_STEP, WIZARD_STEPS } from './wizard-steps'
import { WizardProgress } from './WizardProgress'

const SECTIONS = [OrganizationSection, AboutSection, LocationSection, NeedsSection, DeliverySection] as const

const SUBMIT_ERRORS = ['validation', 'rate_limited', 'conflict', 'network', 'timeout', 'server'] as const

/** The six-step registration (doc/specs/dodarprieku.md, flow 1). */
export const RegisterWizard = ({ restore }: { restore: boolean }) => {
  const { t } = useTranslation('register')
  const wizard = useRegisterWizard(restore)
  const { step, attempt, submit } = wizard
  const container = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const shownStep = useRef(step)

  // A new step: move focus to its heading so a keyboard or screen-reader user starts at the top of it.
  useEffect(() => {
    if (shownStep.current === step) return
    shownStep.current = step
    heading.current?.focus()
  }, [step])

  // A failed "Tālāk" or submit: focus the first field with a problem.
  useEffect(() => {
    if (attempt === 0) return
    const first = container.current?.querySelector<HTMLElement>(ERROR_SELECTOR)
    first?.focus()
  }, [attempt])

  if (submit.kind === 'done') return <SuccessScreen email={submit.email} />

  const Section = SECTIONS[step]
  const id = WIZARD_STEPS[step] ?? 'review'
  const hasErrors = Object.keys(wizard.errors).length > 0
  const submitError = submit.kind === 'failed' ? submit.error : null
  const submitKey = submitError === null ? null : (SUBMIT_ERRORS as readonly string[]).includes(submitError) ? submitError : 'generic'

  return (
    <div className="space-y-8">
      <WizardProgress step={step} furthest={wizard.furthest} onGo={wizard.goTo} />

      {wizard.restored && (
        <Alert tone="info" title={t('draft.restored')}>
          <span className="flex flex-wrap items-center gap-3">
            {t('draft.restoredBody')}
            <button type="button" onClick={wizard.startOver} className="min-h-11 font-medium underline underline-offset-4">
              {t('draft.startOver')}
            </button>
          </span>
        </Alert>
      )}

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (step === REVIEW_STEP) void wizard.send()
          else wizard.next()
        }}
        className="rounded-(--radius-2xl) border border-(--border-subtle) bg-(--surface-raised) p-5 shadow-(--shadow-card) sm:p-8"
      >
        <div ref={container} className="space-y-8">
          <div>
            <p className="text-(length:--text-sm) font-medium text-(--text-accent)">
              {t('progress.stepShort', { n: step + 1, total: WIZARD_STEPS.length })}
            </p>
            <h2 ref={heading} tabIndex={-1} className="font-display text-(length:--text-3xl) text-(--text-primary) outline-none">
              {t(`steps.${id}`)}
            </h2>
            <p className="mt-2 text-(--text-secondary)">{t(`stepIntro.${id}`)}</p>
          </div>

          {hasErrors && <Alert tone="error" title={t('stepErrors.title')}>{t('stepErrors.body')}</Alert>}

          {Section ? <Section form={wizard.form} update={wizard.update} errors={wizard.errors} /> : <ReviewStep wizard={wizard} />}

          {submitKey !== null && (
            <Alert tone="error" title={t(`submitErrors.${submitKey}.title`)}>{t(`submitErrors.${submitKey}.body`, { email: CONTACT.email })}</Alert>
          )}
        </div>

        <div className="mt-10 flex flex-col-reverse gap-3 border-t border-(--border-subtle) pt-6 sm:flex-row sm:justify-between">
          {step > 0 ? (
            <Button variant="secondary" onClick={wizard.back}>{t('nav.back')}</Button>
          ) : <span />}
          <Button type="submit" size="lg" loading={submit.kind === 'submitting'} loadingLabel={t('nav.submitting')}>
            {step === REVIEW_STEP ? t('nav.submit') : t('nav.next')}
            {step !== REVIEW_STEP && <Icon name="arrowRight" />}
          </Button>
        </div>
      </form>
    </div>
  )
}
