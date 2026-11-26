import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import type { PledgeOutcome } from './PledgeForm'

/**
 * Step 3 of "Es ziedošu", inside the card: thanks, and where the thank-you
 * email goes. The newsletter was already offered in step 2, so it is not
 * offered again here.
 */
export const PledgeThanks = ({ outcome, onDone }: { outcome: PledgeOutcome; onDone: () => void }) => {
  const { t } = useTranslation('charity')

  return (
    <div className="space-y-5 text-center" role="status">
      <span aria-hidden="true" className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-(--surface-accent-soft) text-(length:--text-2xl) text-(--text-accent)">
        <Icon name="heart" />
      </span>
      <div>
        <p className="text-(length:--text-2xl) font-semibold text-(--text-primary)">{t('pledge.thanks.title')}</p>
        <p className="mt-1 text-(--text-secondary)">{t('pledge.thanks.body')}</p>
        {outcome.email !== '' && <p className="mt-1 text-(length:--text-sm) text-(--text-secondary)">{t('pledge.thanks.email', { email: outcome.email })}</p>}
        {outcome.subscribed && <p className="mt-1 text-(length:--text-sm) text-(--text-secondary)">{t('pledge.thanks.subscribed')}</p>}
      </div>
      <Button variant="secondary" className="w-full" onClick={onDone}>
        {t('pledge.thanks.done')}
      </Button>
    </div>
  )
}
