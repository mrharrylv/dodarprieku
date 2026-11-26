import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LIMITS } from '@shared/contracts'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { requestSubscriberList, type ApiFailureKind } from '@/lib/account-api'
import { COMMON_FAILURES, failureKey, formatDate } from './format'

type State = { readonly kind: 'idle' | 'sending' } | { readonly kind: 'sent' } | { readonly kind: 'failed'; readonly error: ApiFailureKind }

/** "Pieprasīt abonentu sarakstu": the admin sends the charity its subscribers' list. */
export const ListRequestPanel = ({ lastRequestAt, subscribers }: { lastRequestAt: string | undefined; subscribers: number }) => {
  const { t } = useTranslation('account')
  const [message, setMessage] = useState('')
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [last, setLast] = useState(lastRequestAt)

  const send = async () => {
    setState({ kind: 'sending' })
    const result = await requestSubscriberList(message)
    if (result.ok) {
      setState({ kind: 'sent' })
      setLast(result.data.createdAt)
      setMessage('')
    } else {
      setState({ kind: 'failed', error: result.error })
    }
  }

  return (
    <section aria-labelledby="list-request-title" className="space-y-4 rounded-(--radius-2xl) border border-(--border-subtle) bg-(--surface-raised) p-5 sm:p-8">
      <h2 id="list-request-title" className="font-display text-(length:--text-2xl) text-(--text-primary)">{t('listRequest.title')}</h2>
      <p className="text-(--text-secondary)">{t('listRequest.body', { count: subscribers })}</p>
      <p className="text-(length:--text-sm) text-(--text-muted)">
        {last === undefined ? t('listRequest.never') : t('listRequest.last', { date: formatDate(last, true) })}
      </p>
      <Textarea label={t('listRequest.message')} badge={t('listRequest.optional')} rows={3} maxLength={LIMITS.pledgeMessage}
        value={message} onChange={(e) => setMessage(e.target.value)} />
      {state.kind === 'sent' && <Alert tone="success" title={t('listRequest.sent.title')}>{t('listRequest.sent.body')}</Alert>}
      {state.kind === 'failed' && (
        <Alert tone="error" title={t(`failures.${failureKey(state.error, COMMON_FAILURES)}`)}>{t('listRequest.failedBody')}</Alert>
      )}
      <Button variant="secondary" onClick={() => void send()} loading={state.kind === 'sending'} loadingLabel={t('listRequest.sending')}>
        {t('listRequest.submit')}
      </Button>
    </section>
  )
}
