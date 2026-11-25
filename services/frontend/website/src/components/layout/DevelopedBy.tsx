import { Trans, useTranslation } from 'react-i18next'

import { DEVELOPER } from '@/config/site'
import { cn } from '@/lib/cn'

/**
 * The developer credit, for every style's footer.
 *
 * It sets no colour or size of its own: it inherits the footer's, so it
 * matches whatever style it sits in. The developer's name is a proper noun
 * and stays untranslated; the words around it come from `footer.developedBy`.
 */
export const DevelopedBy = ({ className }: { className?: string }) => {
  const { t } = useTranslation('common')

  return (
    <p className={cn(className)}>
      {/* <1> is the SECOND element: react-i18next indexes children from 0, and
          the leading empty span is what makes the numbering line up. */}
      <Trans
        t={t}
        i18nKey="footer.developedBy"
        values={{ developer: DEVELOPER.name }}
        components={[
          <span key="0" />,
          <a
            key="1"
            href={DEVELOPER.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-(--text-secondary)"
          />,
        ]}
      />
    </p>
  )
}
