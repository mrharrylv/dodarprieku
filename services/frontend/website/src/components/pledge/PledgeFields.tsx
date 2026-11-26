import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { cn } from '@/lib/cn'
import { localePath } from '@/lib/locale-path'
import { Input } from '@/components/ui/Field'
import { Checkbox } from './Checkbox'
import type { PledgeDraft } from './pledge-form'

interface FieldsProps {
  readonly draft: PledgeDraft
  readonly set: (patch: Partial<PledgeDraft>) => void
  readonly msg: (field: string) => string | undefined
}

/** "Anonīmi" or "Ar vārdu"; by name, the name and an optional company, both shown publicly. */
export const IdentityChoice = ({ draft, set, msg }: FieldsProps) => {
  const { t } = useTranslation('charity')
  return (
    <>
      <fieldset>
        <legend className="mb-2 text-(length:--text-sm) font-medium text-(--text-primary)">{t('pledge.identity')}</legend>
        <div className="grid grid-cols-2 gap-2">
          {([true, false] as const).map((anonymous) => (
            <label
              key={String(anonymous)}
              className={cn(
                'flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-(--radius-md) border px-3 text-(length:--text-sm) font-medium',
                draft.anonymous === anonymous ? 'border-(--ring-accent) bg-(--surface-accent-soft) text-(--text-primary)' : 'border-(--border-strong) text-(--text-secondary)',
              )}
            >
              <input type="radio" name="pledge-identity" className="accent-(--fill-accent)" checked={draft.anonymous === anonymous} onChange={() => set({ anonymous })} />
              {anonymous ? t('pledge.anonymous') : t('pledge.public')}
            </label>
          ))}
        </div>
      </fieldset>
      {!draft.anonymous && (
        <div className="space-y-4 rounded-(--radius-lg) bg-(--surface-sunken) p-3">
          <Input label={t('pledge.name')} hint={t('pledge.nameHint')} required autoComplete="name" value={draft.name} onChange={(e) => set({ name: e.target.value })} error={msg('name')} />
          <Input label={t('pledge.company')} badge={t('pledge.optional')} hint={t('pledge.companyHint')} autoComplete="organization" value={draft.company} onChange={(e) => set({ company: e.target.value })} error={msg('company')} />
        </div>
      )}
    </>
  )
}

/** This organisation's news, the general newsletter, and the consent either needs (or the email alone does). */
export const NewsletterChoice = ({ draft, set, msg }: FieldsProps) => {
  const { t } = useTranslation('charity')
  const { locale } = useLocale()
  const asksConsent = draft.email.trim() !== '' || draft.subscribe || draft.general
  return (
    <div className="space-y-1">
      <Checkbox checked={draft.subscribe} onChange={(subscribe) => set({ subscribe })} label={t('pledge.subscribe')} hint={t('pledge.subscribeHint')} />
      <Checkbox checked={draft.general} onChange={(general) => set({ general })} label={t('pledge.general')} hint={t('pledge.generalHint')} />
      {asksConsent && (
        <Checkbox
          checked={draft.consent}
          onChange={(consent) => set({ consent })}
          error={msg('consent')}
          label={
            <>
              {t('pledge.consent')}{' '}
              <Link to={localePath(ROUTES.privacy, locale)} className="text-(--text-accent) underline underline-offset-2">
                {t('pledge.privacy')}
              </Link>
            </>
          }
        />
      )}
    </div>
  )
}
