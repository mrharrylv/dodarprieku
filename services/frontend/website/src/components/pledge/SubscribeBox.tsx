import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import type { FieldErrors } from '@shared/validate'
import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { postSubscribe, type ApiFailure } from '@/lib/public-api'
import { cn } from '@/lib/cn'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { ApiErrorNotice } from '@/components/charity/ApiErrorNotice'
import { Checkbox, Honeypot } from './Checkbox'
import { fieldMessage } from './form-errors'
import { buildSubscribe, isBot, type SubscribeDraft } from './pledge-form'

type Status = { readonly kind: 'idle' | 'sending' | 'done' } | { readonly kind: 'failed'; readonly error: ApiFailure }

/**
 * The newsletter / urgent-needs sign-up (`POST /api/subscribe`), on the map's
 * panel, in a charity's card and after a pledge. `charityId` ties it to that
 * organisation, and then an extra tick box, "Saņemt arī vispārējos
 * jaunumus", adds the general newsletter; the rail's sign-up is always general.
 */
export const SubscribeBox = ({
  charityId,
  initialEmail = '',
  className,
  bare = false,
}: {
  charityId?: string
  initialEmail?: string
  className?: string
  /** Without its own heading and card, inside another one. */
  bare?: boolean
}) => {
  const { t } = useTranslation('charity')
  const { locale } = useLocale()
  const [draft, setDraft] = useState<SubscribeDraft>({ email: initialEmail, name: '', consent: false, general: false, website: '' })
  const [fields, setFields] = useState<FieldErrors>({})
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const set = (patch: Partial<SubscribeDraft>) => setDraft((prev) => ({ ...prev, ...patch }))
  const msg = (field: string) => fieldMessage(t, 'subscribe', field, fields[field])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const built = buildSubscribe(draft, charityId)
    if (!built.ok) {
      setFields(built.fields)
      setStatus(isBot(built.fields) ? { kind: 'failed', error: { kind: 'server' } } : { kind: 'idle' })
      return
    }
    setFields({})
    setStatus({ kind: 'sending' })
    const result = await postSubscribe(built.value)
    if (result.ok) return setStatus({ kind: 'done' })
    if (result.error.kind === 'validation') setFields(result.error.fields)
    setStatus({ kind: 'failed', error: result.error })
  }

  const shell = bare ? className : cn('rounded-(--radius-xl) border border-(--border-subtle) bg-(--surface-raised) p-5 shadow-(--shadow-subtle)', className)

  if (status.kind === 'done') {
    return (
      <div className={shell}>
        <Alert tone="success" title={t('subscribe.success')} />
      </div>
    )
  }

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className={cn('relative space-y-3', shell)}>
      {!bare && (
        <div>
          <h2 className="text-(length:--text-lg) font-semibold text-(--text-primary)">{t('subscribe.title')}</h2>
          <p className="mt-1 text-(length:--text-sm) text-(--text-secondary)">{t('subscribe.body')}</p>
        </div>
      )}
      <Input label={t('subscribe.email')} type="email" autoComplete="email" required value={draft.email} onChange={(e) => set({ email: e.target.value })} error={msg('email')} />
      <Input label={t('subscribe.name')} badge={t('pledge.optional')} autoComplete="name" value={draft.name} onChange={(e) => set({ name: e.target.value })} error={msg('name')} />
      <Checkbox
        checked={draft.consent}
        onChange={(consent) => set({ consent })}
        error={msg('consent')}
        label={
          <>
            {t('subscribe.consent')}{' '}
            <Link to={localePath(ROUTES.privacy, locale)} className="text-(--text-accent) underline underline-offset-2">
              {t('pledge.privacy')}
            </Link>
          </>
        }
      />
      {charityId !== undefined && (
        <Checkbox
          checked={draft.general}
          onChange={(general) => set({ general })}
          label={t('subscribe.general')}
          hint={t('subscribe.generalHint')}
        />
      )}
      <Honeypot label={t('pledge.honeypot')} value={draft.website} onChange={(website) => set({ website })} />
      {status.kind === 'failed' && <ApiErrorNotice error={status.error} />}
      <Button type="submit" loading={status.kind === 'sending'} loadingLabel={t('subscribe.submitting')} className="w-full">
        {t('subscribe.submit')}
      </Button>
    </form>
  )
}
