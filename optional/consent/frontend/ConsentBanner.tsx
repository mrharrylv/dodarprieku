import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/config/site'
import { useHydrated } from '@/hooks/useHydrated'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { useConsent } from '@/hooks/useConsent'

/**
 * The consent banner.
 *
 * Design constraints that are legal requirements, not taste:
 *
 *  - **Reject is as easy as Accept.** Same prominence, same number of clicks,
 *    side by side. Burying rejection behind a "Manage preferences" screen is
 *    the dark pattern regulators have been fining people for.
 *  - **Nothing is pre-ticked**, and nothing loads before a choice is made.
 *  - **Dismissing is not consenting.** There is no X. Continuing to browse is
 *    not consent either, so the banner does not offer that as an escape.
 *  - It does **not** block the page. A modal that traps the visitor until they
 *    agree makes the consent non-free under Art. 7(4).
 *
 * Rendered only when the site actually needs consent for something. On a site
 * that contacts nobody: the template's default: showing a cookie banner is
 * theatre, and it trains people to click Accept without reading.
 *
 * Not in the prerendered HTML. The build renders every page with no visitor,
 * so it cannot know whether this one has already decided, and the browser's
 * first render must match the build's. The banner appears once hydration is
 * done, and only to a visitor who has not decided; putting it in the HTML
 * would flash it at every returning visitor.
 */
export const ConsentBanner = () => {
  const { t } = useTranslation('common')
  const { locale } = useLocale()
  const { decided, acceptAll, rejectAll } = useConsent()
  const hydrated = useHydrated()
  const headingRef = useRef<HTMLParagraphElement>(null)
  const visible = hydrated && !decided

  // Announce it once when it appears. Without this a screen reader user is
  // never told a decision is waiting for them at the bottom of the page.
  useEffect(() => {
    if (visible) headingRef.current?.focus()
  }, [visible])

  if (!visible) return null

  return (
    <div
      role="region"
      aria-label={t('consent.title')}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-(--border-subtle) bg-(--surface-raised) shadow-(--shadow-lifted)"
    >
      <Container>
        {/*
          pb accounts for the iOS home-indicator band. A button sitting in that
          strip is swiped over rather than tapped.
        */}
        <div className="flex flex-col gap-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <p
              ref={headingRef}
              tabIndex={-1}
              className="font-medium text-(--text-primary) focus:outline-none"
            >
              {t('consent.title')}
            </p>
            <p className="mt-1 text-(length:--text-sm) text-(--text-secondary)">
              {t('consent.body')}{' '}
              <Link
                to={localePath(ROUTES.cookies, locale)}
                className="text-(--text-accent) underline underline-offset-2"
              >
                {t('consent.learnMore')}
              </Link>
            </p>
          </div>

          {/* Reject first in the DOM, so it is also first in the tab order. */}
          <div className="flex shrink-0 gap-3">
            <Button variant="secondary" onClick={rejectAll}>
              {t('consent.reject')}
            </Button>
            <Button onClick={acceptAll}>{t('consent.accept')}</Button>
          </div>
        </div>
      </Container>
    </div>
  )
}
