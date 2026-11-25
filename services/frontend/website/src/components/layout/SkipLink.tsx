import { useTranslation } from 'react-i18next'

import { MAIN_CONTENT_ID } from '@/config/dom'

/**
 * The first thing in the tab order.
 *
 * Without it, a keyboard user tabs through the whole header: logo, every nav
 * link, the language switcher, the theme toggle: on every single page before
 * reaching the content. Invisible until focused, then unmissable.
 */
export const SkipLink = () => {
  const { t } = useTranslation('common')

  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only-focusable absolute left-4 top-4 z-[100] rounded-(--radius-md) bg-(--fill-accent) px-4 py-2.5 font-medium text-(--text-on-accent) shadow-(--shadow-lifted)"
    >
      {t('a11y.skipToContent')}
    </a>
  )
}
