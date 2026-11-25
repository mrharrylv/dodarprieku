import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Panel } from './Panel'
import { panelId } from './sections'

/**
 * Screen one: the page's only h1, two buttons, and a cue that there is more.
 *
 * The cue matters more here than in a scrolling layout. A screen that ends
 * exactly at the fold gives a visitor no evidence that anything follows it.
 */
export const Hero = () => {
  const { t } = useTranslation('home')
  const { locale } = useLocale()

  return (
    <Panel id={panelId('hero')} className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-dot-grid opacity-50"
      />

      <div className="relative">
        <p className="text-(length:--text-xs) font-semibold uppercase tracking-[0.32em] text-(--text-accent)">
          {t('hero.eyebrow')}
        </p>

        <h1 className="mt-8 text-(length:--text-5xl) font-semibold leading-[1.04] tracking-tight text-balance break-words text-(--text-primary)">
          {t('hero.title')}
        </h1>

        <p className="mx-auto mt-7 max-w-(--container-prose) text-(length:--text-lg) text-(--text-secondary)">
          {t('hero.subtitle')}
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <ButtonLink to={localePath(ROUTES.contact, locale)} size="lg">
            {t('hero.primaryCta')}
          </ButtonLink>
          <ButtonLink
            to={localePath(ROUTES.services, locale)}
            size="lg"
            variant="secondary"
          >
            {t('hero.secondaryCta')}
          </ButtonLink>
        </div>
      </div>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-10 flex justify-center text-(--text-muted)"
      >
        <Icon name="chevronDown" className="h-6 w-6 animate-drift" />
      </span>
    </Panel>
  )
}
