import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Icon } from '@/components/ui/Icon'

/** How long "Nokopēts" stays before the button reads "Kopēt" again. */
export const COPIED_MS = 2_000

type State = 'idle' | 'copied' | 'failed'

/** Copies a delivery address. Says so when it worked, and what to do when it did not. */
export const CopyButton = ({ text }: { text: string }) => {
  const { t } = useTranslation('charity')
  const [state, setState] = useState<State>('idle')

  useEffect(() => {
    if (state !== 'copied') return
    const timer = setTimeout(() => setState('idle'), COPIED_MS)
    return () => clearTimeout(timer)
  }, [state])

  const copy = async () => {
    try {
      if (typeof navigator === 'undefined' || navigator.clipboard === undefined) throw new Error('no clipboard')
      await navigator.clipboard.writeText(text)
      setState('copied')
    } catch {
      setState('failed')
    }
  }

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={t('delivery.copyLabel', { address: text })}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-(--border-strong) bg-(--surface-raised) px-3.5 text-(length:--text-sm) font-medium text-(--text-primary) hover:border-(--ring-accent) hover:text-(--text-accent) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring-accent)"
      >
        {state === 'copied' ? (
          <Icon name="check" />
        ) : (
          <svg viewBox="0 0 24 24" className="h-[1.25em] w-[1.25em]" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round">
            <path d="M9 9h10a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1V9Zm-4 6V5a1 1 0 0 1 1-1h9" />
          </svg>
        )}
        <span aria-live="polite">{state === 'copied' ? t('delivery.copied') : t('delivery.copy')}</span>
      </button>
      {state === 'failed' && (
        <p role="alert" className="mt-1 max-w-56 text-(length:--text-xs) text-(--color-danger-600)">
          {t('delivery.copyFailed')}
        </p>
      )}
    </div>
  )
}
