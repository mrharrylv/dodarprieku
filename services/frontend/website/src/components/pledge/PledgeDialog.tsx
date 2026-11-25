import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { PublicCharity } from '@shared/contracts'
import type { NeedView } from '@/lib/snapshot'
import { Icon } from '@/components/ui/Icon'
import { PledgeForm } from './PledgeForm'
import { PledgeThanks } from './PledgeThanks'

export interface PledgeOutcome {
  readonly email: string
  readonly subscribed: boolean
}

/**
 * "Es ziedošu": a native modal dialog (focus trapped, page inert, Escape
 * closes) holding the form, then the thank-you.
 */
export const PledgeDialog = ({
  charity,
  needs,
  allowedKeys,
  onClose,
  onPledged,
}: {
  charity: PublicCharity
  needs: readonly NeedView[]
  allowedKeys: readonly string[]
  onClose: () => void
  onPledged: () => void
}) => {
  const { t } = useTranslation('charity')
  const ref = useRef<HTMLDialogElement>(null)
  const [outcome, setOutcome] = useState<PledgeOutcome | null>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog === null) return
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
    return () => {
      if (typeof dialog.close === 'function' && dialog.open) dialog.close()
    }
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby="pledge-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      className="m-auto max-h-[92dvh] w-[min(36rem,calc(100%-2rem))] overflow-y-auto rounded-(--radius-2xl) border border-(--border-subtle) bg-(--surface-raised) p-0 text-(--text-primary) shadow-(--shadow-lifted) backdrop:bg-(--color-ink-950)/50 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b border-(--border-subtle) px-6 py-4">
        <h2 id="pledge-title" className="text-(length:--text-xl) font-semibold">
          {t('pledge.title')}
        </h2>
        <button type="button" onClick={onClose} aria-label={t('pledge.close')} className="flex h-11 w-11 items-center justify-center rounded-full text-(--text-secondary) hover:bg-(--surface-sunken) hover:text-(--text-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring-accent)">
          <Icon name="close" />
        </button>
      </div>
      <div className="px-6 py-5">
        {outcome === null ? (
          <PledgeForm
            charity={charity}
            needs={needs}
            allowedKeys={allowedKeys}
            onDone={(result) => {
              setOutcome(result)
              onPledged()
            }}
          />
        ) : (
          <PledgeThanks charityId={charity.id} outcome={outcome} onClose={onClose} />
        )}
      </div>
    </dialog>
  )
}
