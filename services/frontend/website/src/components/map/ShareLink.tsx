import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { charityPath } from '@/config/site'
import { originUrl } from '@/config/env'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { buttonClasses } from '@/components/ui/button-styles'
import { Icon } from '@/components/ui/Icon'
import { COPIED_MS } from '@/components/charity/CopyButton'

type State = 'idle' | 'copied' | 'failed'

/**
 * "Kopēt saiti": a charity's shareable address, `/organizacija/<slug>`, which
 * opens the map flown to it with this card expanded. Says when it worked, and
 * what to do when the browser would not copy.
 */
export const ShareLink = ({ slug }: { slug: string }) => {
  const { t } = useTranslation('map')
  const { locale } = useLocale()
  const [state, setState] = useState<State>('idle')

  useEffect(() => {
    if (state !== 'copied') return undefined
    const timer = setTimeout(() => setState('idle'), COPIED_MS)
    return () => clearTimeout(timer)
  }, [state])

  const copy = async () => {
    try {
      if (typeof navigator === 'undefined' || navigator.clipboard === undefined) throw new Error('no clipboard')
      await navigator.clipboard.writeText(`${originUrl()}${localePath(charityPath(slug), locale)}`)
      setState('copied')
    } catch (error) {
      console.warn('[map] the link could not be copied', error)
      setState('failed')
    }
  }

  return (
    <div>
      <button type="button" onClick={() => void copy()} className={buttonClasses('secondary', 'sm', 'w-full')}>
        <Icon name={state === 'copied' ? 'check' : 'link'} />
        <span aria-live="polite">{state === 'copied' ? t('popup.shared') : t('popup.share')}</span>
      </button>
      {state === 'failed' && (
        <p role="alert" className="mt-2 text-(length:--text-sm) text-(--text-secondary)">
          {t('popup.shareFailed')}
        </p>
      )}
    </div>
  )
}
