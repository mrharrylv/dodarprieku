import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useConsent } from '@/hooks/useConsent'
import type { ConsentCategory } from '@/context/consent-context'
import { Button } from '@/components/ui/Button'
import { useHydrated } from '@/hooks/useHydrated'

/**
 * Wraps a third-party embed so it is not loaded until the visitor allows it.
 *
 * The crucial part is what it does when consent is absent: it renders a
 * PLACEHOLDER, not the embed with a hidden overlay. An `<iframe>` behind a
 * cover has still been requested: the visitor's IP, User-Agent and Referer
 * have already reached the third party, and the consent banner was decoration.
 *
 * Because `children` is a function, React never constructs the embed's element
 * until consent exists.
 *
 * The prerendered page shows the placeholder to everyone, because the build
 * knows no visitor's consent. A visitor who has already agreed gets the embed
 * straight after hydration, not in the first render, which has to match the
 * build's HTML.
 *
 *   <ConsentGate category="embeds" title={t('map.title')} description={...}>
 *     {() => <iframe src="https://www.google.com/maps/embed?..." />}
 *   </ConsentGate>
 */
export const ConsentGate = ({
  category,
  title,
  description,
  children,
}: {
  category: Exclude<ConsentCategory, 'necessary'>
  /** What the embed is, e.g. "Map". */
  title: string
  /** Who it contacts and what that means, in plain language. */
  description: string
  children: () => ReactNode
}) => {
  const { t } = useTranslation('common')
  const { consent, save } = useConsent()
  const hydrated = useHydrated()

  if (hydrated && consent[category]) return <>{children()}</>

  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-(--radius-lg) border border-dashed border-(--border-strong) bg-(--surface-sunken) p-8 text-center">
      <div className="max-w-md">
        <p className="font-medium text-(--text-primary)">{title}</p>
        <p className="mt-2 text-(length:--text-sm) text-(--text-secondary)">{description}</p>
      </div>

      <Button onClick={() => save({ [category]: true })}>
        {t('consent.loadContent')}
      </Button>

      <p className="text-(length:--text-xs) text-(--text-muted)">
        {t('consent.gateNote')}
      </p>
    </div>
  )
}
