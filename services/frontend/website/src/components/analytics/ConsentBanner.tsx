import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { Button } from '@/components/ui/Button'

/**
 * The one question the site asks: may it load Google Analytics. Reject is
 * as easy as accept and first in the tab order; nothing is pre-ticked; there
 * is no close button, because dismissing is not consenting; it never blocks
 * the page. Shown only after hydration, only to a visitor without an answer.
 */
export const ConsentBanner = ({ onAccept, onReject }: { onAccept: () => void; onReject: () => void }) => {
  const { t } = useTranslation('common')
  const { locale } = useLocale()
  const headingRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div
      role="region"
      aria-label={t('consent.title')}
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-(--radius-xl) border border-(--border-subtle) bg-(--surface-raised) p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-(--shadow-lifted)"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <p ref={headingRef} tabIndex={-1} className="font-medium text-(--text-primary) focus:outline-none">
            {t('consent.title')}
          </p>
          <p className="mt-1 text-(length:--text-sm) text-(--text-secondary)">
            {t('consent.body')}{' '}
            <Link to={localePath(ROUTES.cookies, locale)} className="text-(--text-accent) underline underline-offset-2">
              {t('consent.learnMore')}
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          <Button variant="secondary" onClick={onReject}>
            {t('consent.reject')}
          </Button>
          <Button onClick={onAccept}>{t('consent.accept')}</Button>
        </div>
      </div>
    </div>
  )
}
