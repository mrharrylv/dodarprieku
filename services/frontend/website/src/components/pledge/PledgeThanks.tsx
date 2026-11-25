import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import type { PledgeOutcome } from './PledgeDialog'
import { SubscribeBox } from './SubscribeBox'

/** After a pledge: thanks, and the newsletter offered to anyone who did not sign up already. */
export const PledgeThanks = ({ charityId, outcome, onClose }: { charityId: string; outcome: PledgeOutcome; onClose: () => void }) => {
  const { t } = useTranslation('charity')

  return (
    <div className="space-y-5" role="status">
      <div className="text-center">
        <span aria-hidden="true" className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-(--surface-accent-soft) text-(length:--text-2xl) text-(--text-accent)">
          <Icon name="heart" />
        </span>
        <p className="mt-3 text-(length:--text-2xl) font-semibold text-(--text-primary)">{t('pledge.thanks.title')}</p>
        <p className="mt-1 text-(--text-secondary)">{t('pledge.thanks.body')}</p>
        {outcome.email !== '' && <p className="mt-1 text-(length:--text-sm) text-(--text-secondary)">{t('pledge.thanks.email', { email: outcome.email })}</p>}
        {outcome.subscribed && <p className="mt-1 text-(length:--text-sm) text-(--text-secondary)">{t('pledge.thanks.subscribed')}</p>}
      </div>
      {!outcome.subscribed && (
        <div className="rounded-(--radius-xl) bg-(--surface-sunken) p-4">
          <p className="mb-3 font-medium text-(--text-primary)">{t('pledge.thanks.offer')}</p>
          <SubscribeBox charityId={charityId} initialEmail={outcome.email} bare />
        </div>
      )}
      <Button variant="secondary" className="w-full" onClick={onClose}>
        {t('pledge.thanks.done')}
      </Button>
    </div>
  )
}
