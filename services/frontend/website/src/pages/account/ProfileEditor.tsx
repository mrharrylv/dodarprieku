import { useCallback, useEffect, useId, useRef, useState, type ComponentType } from 'react'
import { useTranslation } from 'react-i18next'

import type { AccountView } from '@shared/contracts'
import type { FieldErrors } from '@shared/validate'

import { AboutSection } from '@/components/profile-editor/AboutSection'
import { ERROR_SELECTOR } from '@/components/profile-editor/control-styles'
import { DeliverySection } from '@/components/profile-editor/DeliverySection'
import { profileToForm, type ProfileForm, type SectionProps } from '@/components/profile-editor/form-model'
import { LocationSection } from '@/components/profile-editor/LocationSection'
import { NeedsSection } from '@/components/profile-editor/NeedsSection'
import { OrganizationSection } from '@/components/profile-editor/OrganizationSection'
import { PROFILE_SECTIONS, sectionOf, validateWholeForm, type ProfileSection } from '@/components/profile-editor/sections'
import { SponsorsSection } from '@/components/profile-editor/SponsorsSection'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { saveProfile, type ApiFailureKind } from '@/lib/account-api'
import { EditorTabs } from './EditorTabs'
import { COMMON_FAILURES, failureKey } from './format'

const PANELS: Record<ProfileSection, ComponentType<SectionProps>> = {
  organization: OrganizationSection,
  about: AboutSection,
  location: LocationSection,
  needs: NeedsSection,
  delivery: DeliverySection,
  sponsors: SponsorsSection,
}

type SaveState = { readonly kind: 'idle' | 'saving' | 'saved' } | { readonly kind: 'failed'; readonly error: ApiFailureKind }

const SAVE_FAILURES: readonly ApiFailureKind[] = ['validation', 'unauthorized', ...COMMON_FAILURES]

const sectionsWithErrors = (errors: FieldErrors): ProfileSection[] =>
  PROFILE_SECTIONS.filter((s) => Object.keys(errors).some((path) => sectionOf(path) === s))

/**
 * The profile editor: the wizard's sections as tabs, plus the sponsor wall,
 * and one "Iesniegt izmaiņas". It opens on the change waiting for approval
 * when there is one, so a second edit builds on the first.
 */
export const ProfileEditor = ({ account, onSaved }: { account: AccountView; onSaved: (account: AccountView) => void }) => {
  const { t } = useTranslation('account')
  const idPrefix = useId()
  const [form, setForm] = useState<ProfileForm>(() => profileToForm(account.pendingUpdate?.profile ?? account.profile))
  const [tab, setTab] = useState<ProfileSection>('organization')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [attempt, setAttempt] = useState(0)
  const [save, setSave] = useState<SaveState>({ kind: 'idle' })
  const panel = useRef<HTMLDivElement>(null)

  const update = useCallback((fn: (f: ProfileForm) => ProfileForm) => {
    setForm((f) => fn(f))
    setSave((s) => (s.kind === 'saved' ? { kind: 'idle' } : s))
  }, [])

  useEffect(() => {
    if (attempt > 0) panel.current?.querySelector<HTMLElement>(ERROR_SELECTOR)?.focus()
  }, [attempt])

  const showErrors = (found: FieldErrors) => {
    setErrors(found)
    setTab(sectionsWithErrors(found)[0] ?? tab)
    setAttempt((n) => n + 1)
  }

  const submit = async () => {
    const checked = validateWholeForm(form)
    if (!checked.ok) return showErrors(checked.fields)
    setErrors({})
    setSave({ kind: 'saving' })
    const result = await saveProfile(checked.profile)
    if (result.ok) {
      setSave({ kind: 'saved' })
      onSaved(result.data)
      return
    }
    setSave({ kind: 'failed', error: result.error })
    if (result.error === 'validation' && result.fields) showErrors(result.fields)
  }

  const Panel = PANELS[tab]
  const failed = save.kind === 'failed' ? failureKey(save.error, SAVE_FAILURES) : null

  return (
    <section aria-labelledby={`${idPrefix}-title`} className="space-y-5">
      <div>
        <h2 id={`${idPrefix}-title`} className="font-display text-(length:--text-2xl) text-(--text-primary)">{t('editor.title')}</h2>
        <p className="mt-1 text-(--text-secondary)">{t('editor.intro')}</p>
      </div>
      <EditorTabs active={tab} onSelect={setTab} withErrors={sectionsWithErrors(errors)} idPrefix={idPrefix} />
      <div ref={panel} role="tabpanel" id={`${idPrefix}-panel`} aria-labelledby={`${idPrefix}-tab-${tab}`}
        className="rounded-(--radius-2xl) border border-(--border-subtle) bg-(--surface-raised) p-5 sm:p-8">
        <Panel form={form} update={update} errors={errors} />
      </div>
      {Object.keys(errors).length > 0 && <Alert tone="error" title={t('editor.invalid.title')}>{t('editor.invalid.body')}</Alert>}
      {failed !== null && <Alert tone="error" title={t(`editor.failures.${failed}.title`)}>{t(`editor.failures.${failed}.body`)}</Alert>}
      {save.kind === 'saved' && <Alert tone="success" title={t('editor.saved.title')}>{t('editor.saved.body')}</Alert>}
      <div className="flex justify-end">
        <Button size="lg" onClick={() => void submit()} loading={save.kind === 'saving'} loadingLabel={t('editor.submitting')}>
          {t('editor.submit')}
        </Button>
      </div>
    </section>
  )
}
