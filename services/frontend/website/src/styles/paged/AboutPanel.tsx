import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { ButtonLink } from '@/components/ui/Button'
import { Panel } from './Panel'
import { panelId } from './sections'

/**
 * Screen four: one paragraph, set large enough to be the whole screen.
 *
 * The heading is the small line and the body is the big one, which is the
 * opposite of the rest of the site on purpose: here the sentence is the point
 * and the label is only there to say what it answers.
 */
export const AboutPanel = () => {
  const { t } = useTranslation('home')
  const { locale } = useLocale()

  return (
    <Panel id={panelId('about')} tone="sunken">
      <h2 className="text-(length:--text-xs) font-semibold uppercase tracking-[0.32em] text-(--text-accent)">
        {t('about.title')}
      </h2>

      <p className="mx-auto mt-8 max-w-(--container-prose) text-(length:--text-3xl) font-medium leading-snug tracking-tight text-balance">
        {t('about.body')}
      </p>

      <div className="mt-10">
        <ButtonLink to={localePath(ROUTES.about, locale)} variant="secondary" size="lg">
          {t('about.cta')}
        </ButtonLink>
      </div>
    </Panel>
  )
}
