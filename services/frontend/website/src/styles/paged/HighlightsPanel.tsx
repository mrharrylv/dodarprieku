import { useTranslation } from 'react-i18next'

import { HIGHLIGHTS } from '@/data/services'
import { Panel } from './Panel'
import { panelId } from './sections'

/**
 * Screen two: three reasons, counted.
 *
 * Hairlines rather than cards. A card on a full screen reads as a small thing
 * floating in a large space, and three of them read as a form. The rule between
 * columns does the same separating work with none of the weight.
 */
export const HighlightsPanel = () => {
  const { t } = useTranslation('home')

  return (
    <Panel id={panelId('highlights')} tone="sunken">
      <h2 className="text-(length:--text-4xl) font-semibold tracking-tight text-balance">
        {t('highlights.title')}
      </h2>
      <p className="mx-auto mt-5 max-w-(--container-prose) text-(length:--text-lg) text-(--text-secondary)">
        {t('highlights.subtitle')}
      </p>

      <ul className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-0">
        {HIGHLIGHTS.map((key, index) => (
          <li
            key={key}
            className="border-t border-(--border-subtle) pt-8 first:border-t-0 first:pt-0 sm:border-l sm:border-t-0 sm:px-6 sm:pt-0 sm:first:border-l-0 sm:first:pl-0"
          >
            <span
              aria-hidden="true"
              className="block font-(family-name:--font-display) text-(length:--text-2xl) font-semibold text-(--text-accent)"
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <h3 className="mt-4 text-(length:--text-xl) font-semibold">
              {t(`highlights.items.${key}.title`)}
            </h3>
            <p className="mt-3 text-(--text-secondary)">
              {t(`highlights.items.${key}.body`)}
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
