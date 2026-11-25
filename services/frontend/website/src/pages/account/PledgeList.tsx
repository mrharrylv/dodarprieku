import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { CharityProfile, PledgeRecord } from '@shared/contracts'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { fetchPledges, type ApiFailureKind } from '@/lib/account-api'
import { COMMON_FAILURES, failureKey, formatDate } from './format'
import { pledgeNeedLabels } from './pledge-labels'

type State =
  | { readonly kind: 'loading' }
  | { readonly kind: 'error'; readonly error: ApiFailureKind }
  | { readonly kind: 'ready'; readonly pledges: readonly PledgeRecord[] }

/** Who said they would bring what: date, needs, public name or "Anonīms", message. Never an email. */
export const PledgeList = ({ profile }: { profile: CharityProfile }) => {
  const { t } = useTranslation('account')
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [generation, setGeneration] = useState(0)

  useEffect(() => {
    let live = true
    void fetchPledges().then((result) => {
      if (!live) return
      setState(result.ok ? { kind: 'ready', pledges: result.data } : { kind: 'error', error: result.error })
    })
    return () => {
      live = false
    }
  }, [generation])

  const retry = useCallback(() => {
    setState({ kind: 'loading' })
    setGeneration((g) => g + 1)
  }, [])

  return (
    <section aria-labelledby="pledges-title" className="space-y-4">
      <h2 id="pledges-title" className="font-display text-(length:--text-2xl) text-(--text-primary)">{t('pledges.title')}</h2>
      {state.kind === 'loading' && <p className="text-(--text-muted)" role="status">{t('pledges.loading')}</p>}
      {state.kind === 'error' && (
        <Alert tone="error" title={t(`failures.${failureKey(state.error, COMMON_FAILURES)}`)}>
          <Button variant="secondary" size="sm" className="mt-2" onClick={retry}>{t('retry')}</Button>
        </Alert>
      )}
      {state.kind === 'ready' && state.pledges.length === 0 && <p className="text-(--text-secondary)">{t('pledges.empty')}</p>}
      {state.kind === 'ready' && state.pledges.length > 0 && (
        <ul className="divide-y divide-(--border-subtle) rounded-(--radius-lg) border border-(--border-subtle) bg-(--surface-raised)">
          {state.pledges.map((pledge) => (
            <li key={pledge.id} className="space-y-1 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-(--text-primary)">
                  {pledge.anonymous || !pledge.name ? t('pledges.anonymous') : pledge.name}
                </p>
                <time dateTime={pledge.createdAt} className="text-(length:--text-sm) text-(--text-muted)">
                  {formatDate(pledge.createdAt, true)}
                </time>
              </div>
              <p className="text-(length:--text-sm) text-(--text-secondary)">
                {t('pledges.needs')}: {pledgeNeedLabels(profile, pledge.needs).join(', ')}
              </p>
              {pledge.message !== undefined && pledge.message.trim() !== '' && (
                <blockquote className="border-l-2 border-(--border-accent-soft) pl-3 text-(--text-primary) whitespace-pre-line">{pledge.message}</blockquote>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
