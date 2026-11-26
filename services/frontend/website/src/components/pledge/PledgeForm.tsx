import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import type { PublicCharity } from '@shared/contracts'
import type { FieldErrors } from '@shared/validate'
import { postPledge, type ApiFailure } from '@/lib/public-api'
import type { NeedView } from '@/lib/snapshot'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Field'
import { ApiErrorNotice } from '@/components/charity/ApiErrorNotice'
import { UrgentBadge } from '@/components/charity/UrgentBadge'
import { Honeypot } from './Checkbox'
import { fieldMessage } from './form-errors'
import { IdentityChoice, NewsletterChoice } from './PledgeFields'
import { buildPledge, EMPTY_DRAFT, isBot, type PledgeDraft } from './pledge-form'

/** What the thank-you needs to know about the pledge just sent. */
export interface PledgeOutcome {
  readonly email: string
  readonly subscribed: boolean
}

type Status = { readonly kind: 'idle' | 'sending' } | { readonly kind: 'failed'; readonly error: ApiFailure }

/**
 * Step 2 of "Es ziedošu", inside the charity's card: the message first, then
 * anonymous or by name (with an optional company shown beside it), an
 * optional email for the thank-you in either case, and the newsletters, which
 * need the email and consent.
 */
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
    if (result.ok) return onDone({ email: built.value.email ?? '', subscribed: built.value.subscribe || built.value.general === true })
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

      <Textarea label={t('pledge.message')} badge={t('pledge.optional')} hint={t('pledge.messageHint')} rows={3} value={draft.message} onChange={(e) => set({ message: e.target.value })} error={msg('message')} />
      <IdentityChoice draft={draft} set={set} msg={msg} />
      <Input label={t('pledge.email')} badge={t('pledge.optional')} hint={t('pledge.emailHint')} type="email" autoComplete="email" value={draft.email} onChange={(e) => set({ email: e.target.value })} error={msg('email')} />
      <NewsletterChoice draft={draft} set={set} msg={msg} />
      <Honeypot label={t('pledge.honeypot')} value={draft.website} onChange={(website) => set({ website })} />
      {status.kind === 'failed' && <ApiErrorNotice error={status.error} />}
      <Button type="submit" size="lg" className="w-full" loading={status.kind === 'sending'} loadingLabel={t('pledge.submitting')}>
        {t('pledge.submit')}
      </Button>
    </form>
  )
}
