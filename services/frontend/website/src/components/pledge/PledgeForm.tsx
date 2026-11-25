import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import type { PublicCharity } from '@shared/contracts'
import type { FieldErrors } from '@shared/validate'
import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { postPledge, type ApiFailure } from '@/lib/public-api'
import type { NeedView } from '@/lib/snapshot'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Field'
import { ApiErrorNotice } from '@/components/charity/ApiErrorNotice'
import { UrgentBadge } from '@/components/charity/UrgentBadge'
import { Checkbox, Honeypot } from './Checkbox'
import { fieldMessage } from './form-errors'
import { buildPledge, EMPTY_DRAFT, isBot, type PledgeDraft } from './pledge-form'
import type { PledgeOutcome } from './PledgeDialog'

type Status = { readonly kind: 'idle' | 'sending' } | { readonly kind: 'failed'; readonly error: ApiFailure }

/** The pledge itself: who (anonymous or by name), an optional email, message and newsletter. */
export const PledgeForm = ({
  charity,
  needs,
  allowedKeys,
  onDone,
}: {
  charity: PublicCharity
  needs: readonly NeedView[]
  allowedKeys: readonly string[]
  onDone: (outcome: PledgeOutcome) => void
}) => {
  const { t } = useTranslation('charity')
  const { locale } = useLocale()
  const [draft, setDraft] = useState<PledgeDraft>(EMPTY_DRAFT)
  const [fields, setFields] = useState<FieldErrors>({})
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const set = (patch: Partial<PledgeDraft>) => setDraft((prev) => ({ ...prev, ...patch }))
  const msg = (field: string) => fieldMessage(t, 'pledge', field, fields[field])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const built = buildPledge(draft, needs.map((n) => n.key), allowedKeys)
    if (!built.ok) {
      setFields(built.fields)
      setStatus(isBot(built.fields) ? { kind: 'failed', error: { kind: 'server' } } : { kind: 'idle' })
      return
    }
    setFields({})
    setStatus({ kind: 'sending' })
    const result = await postPledge(charity.id, built.value)
    if (result.ok) return onDone({ email: built.value.email ?? '', subscribed: built.value.subscribe })
    if (result.error.kind === 'validation') setFields(result.error.fields)
    setStatus({ kind: 'failed', error: result.error })
  }

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="relative space-y-5">
      <div>
        <p className="text-(length:--text-sm) font-medium text-(--text-secondary)">{t('pledge.intro')}</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {needs.map((need) => (
            <li key={need.key} className="inline-flex items-center gap-2 rounded-full bg-(--surface-accent-soft) px-3 py-1 text-(length:--text-sm) font-medium text-(--text-primary)">
              {need.label}
              {need.urgent && <UrgentBadge label={t('needs.urgent')} />}
            </li>
          ))}
        </ul>
        {msg('needs') !== undefined && (
          <p role="alert" className="mt-2 text-(length:--text-sm) text-(--color-danger-600)">
            {msg('needs')}
          </p>
        )}
      </div>

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
        <Input label={t('pledge.name')} hint={t('pledge.nameHint')} required autoComplete="name" value={draft.name} onChange={(e) => set({ name: e.target.value })} error={msg('name')} />
      )}
      <Input label={t('pledge.email')} badge={t('pledge.optional')} hint={t('pledge.emailHint')} type="email" autoComplete="email" value={draft.email} onChange={(e) => set({ email: e.target.value })} error={msg('email')} />
      <Textarea label={t('pledge.message')} badge={t('pledge.optional')} hint={t('pledge.messageHint')} rows={3} value={draft.message} onChange={(e) => set({ message: e.target.value })} error={msg('message')} />
      <Checkbox checked={draft.subscribe} onChange={(subscribe) => set({ subscribe })} label={t('pledge.subscribe')} hint={t('pledge.subscribeHint')} />
      {(draft.email.trim() !== '' || draft.subscribe) && (
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
      <Honeypot label={t('pledge.honeypot')} value={draft.website} onChange={(website) => set({ website })} />
      {status.kind === 'failed' && <ApiErrorNotice error={status.error} />}
      <Button type="submit" size="lg" className="w-full" loading={status.kind === 'sending'} loadingLabel={t('pledge.submitting')}>
        {t('pledge.submit')}
      </Button>
    </form>
  )
}
